import mongoose from 'mongoose';
import { UserModel, PointTransactionModel } from '@/models';
import { PointTransactionType } from '@/types/point-transaction.type';
import { UserTier } from '@/types/user.type';
import withTransaction from '@/utils/with-transaction';
import appAssert from '@/utils/app-assert';
import { NOT_FOUND } from '@/constants/http';

const TIER_THRESHOLDS = {
    [UserTier.DIAMOND]: 10000,
    [UserTier.PLATINUM]: 5000,
    [UserTier.GOLD]: 2000,
    [UserTier.SILVER]: 500,
    [UserTier.BRONZE]: 0,
};

/**
 * Determine tier based on points
 */
const calculateTier = (points: number): UserTier => {
    if (points >= TIER_THRESHOLDS[UserTier.DIAMOND]) return UserTier.DIAMOND;
    if (points >= TIER_THRESHOLDS[UserTier.PLATINUM]) return UserTier.PLATINUM;
    if (points >= TIER_THRESHOLDS[UserTier.GOLD]) return UserTier.GOLD;
    if (points >= TIER_THRESHOLDS[UserTier.SILVER]) return UserTier.SILVER;
    return UserTier.BRONZE;
};

/**
 * Add points to a user and log the transaction
 */
export const addPoints = async (
    userId: mongoose.Types.ObjectId,
    amount: number,
    type: PointTransactionType,
    description: string,
    orderId?: mongoose.Types.ObjectId
) => {
    return withTransaction(async (session) => {
        const user = await UserModel.findById(userId).session(session);
        appAssert(user, NOT_FOUND, 'Người dùng không tồn tại');

        // Update user points
        user.collectedPoints += amount;

        // Update tier if necessary
        const newTier = calculateTier(user.collectedPoints);
        if (newTier !== user.tier) {
            user.tier = newTier;
        }

        await user.save({ session });

        // Create transaction log
        await PointTransactionModel.create(
            [
                {
                    userId,
                    amount,
                    type,
                    description,
                    orderId: orderId ?? null,
                },
            ],
            { session }
        );

        return user;
    });
};

/**
 * Handle referral reward when a new user joins
 */
export const rewardReferral = async (userId: string | mongoose.Types.ObjectId, referralCode: string) => {
    return withTransaction(async (session) => {
        const referrer = await UserModel.findOne({ referralCode: referralCode.toUpperCase() }).session(session);
        appAssert(referrer, NOT_FOUND, 'Mã giới thiệu không hợp lệ');

        const newUser = await UserModel.findById(userId).session(session);
        appAssert(newUser, NOT_FOUND, 'Người dùng không tồn tại');
        appAssert(!newUser.referredBy, 400, 'Bạn đã nhập mã giới thiệu trước đó');
        appAssert(referrer._id.toString() !== newUser._id.toString(), 400, 'Không thể tự giới thiệu chính mình');

        // Update new user
        newUser.referredBy = referrer._id as mongoose.Types.ObjectId;
        newUser.collectedPoints += 50; // Bonus for joining
        newUser.tier = calculateTier(newUser.collectedPoints);
        await newUser.save({ session });

        // Reward referrer
        referrer.collectedPoints += 100; // Bonus for inviting
        referrer.tier = calculateTier(referrer.collectedPoints);
        await referrer.save({ session });

        // Log transactions
        await PointTransactionModel.insertMany(
            [
                {
                    userId: referrer._id,
                    amount: 100,
                    type: PointTransactionType.REFERRAL,
                    description: `Thưởng giới thiệu người dùng mới: ${newUser.username}`,
                },
                {
                    userId: newUser._id,
                    amount: 50,
                    type: PointTransactionType.REFERRAL,
                    description: `Thưởng nhập mã giới thiệu từ: ${referrer.username}`,
                },
            ],
            { session }
        );

        return 'Nhập mã giới thiệu thành công';
    });
};
