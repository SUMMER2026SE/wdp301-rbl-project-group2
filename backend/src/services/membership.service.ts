import mongoose from 'mongoose';
import { UserModel, PointTransactionModel } from '@/models';
import { PointTransactionType } from '@/types/point-transaction.type';
import { UserTier } from '@/types/user.type';
import withTransaction from '@/utils/withTransaction';
import appAssert from '@/utils/appAssert';
import { NOT_FOUND } from '@/constants/http';

const TIER_THRESHOLDS = {
    [UserTier.DIAMOND]: 10000,
    [UserTier.PLATINUM]: 5000,
    [UserTier.GOLD]: 2000,
    [UserTier.SILVER]: 500,
    [UserTier.BRONZE]: 0,
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
        user.collected_points += amount;

        // Update tier if necessary
        const newTier = calculateTier(user.collected_points);
        if (newTier !== user.tier) {
            user.tier = newTier;
        }

        await user.save({ session });

        // Create transaction log
        await PointTransactionModel.create(
            [
                {
                    user_id: userId,
                    amount,
                    type,
                    description,
                    order_id: orderId ?? null,
                },
            ],
            { session }
        );

        return user;
    });
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
 * Handle referral reward when a new user joins
 */
export const rewardReferral = async (userId: string | mongoose.Types.ObjectId, referralCode: string) => {
    return withTransaction(async (session) => {
        const referrer = await UserModel.findOne({ referral_code: referralCode.toUpperCase() }).session(session);
        appAssert(referrer, NOT_FOUND, 'Mã giới thiệu không hợp lệ');

        const newUser = await UserModel.findById(userId).session(session);
        appAssert(newUser, NOT_FOUND, 'Người dùng không tồn tại');
        appAssert(!newUser.referred_by, 400, 'Bạn đã nhập mã giới thiệu trước đó');
        appAssert(referrer._id.toString() !== newUser._id.toString(), 400, 'Không thể tự giới thiệu chính mình');

        // Update new user
        newUser.referred_by = referrer._id as mongoose.Types.ObjectId;
        newUser.collected_points += 50; // Bonus for joining
        await newUser.save({ session });

        // Reward referrer
        referrer.collected_points += 100; // Bonus for inviting
        await referrer.save({ session });

        // Log transactions
        await PointTransactionModel.insertMany(
            [
                {
                    user_id: referrer._id,
                    amount: 100,
                    type: PointTransactionType.REFERRAL,
                    description: `Thưởng giới thiệu người dùng mới: ${newUser.username}`,
                },
                {
                    user_id: newUser._id,
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
