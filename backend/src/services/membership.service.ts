import mongoose from 'mongoose';
import { OrderModel, PointTransactionModel, RefreshTokenModel, UserModel, UserVoucherModel, VoucherModel } from '@/models';
import { PointTransactionType } from '@/types/point-transaction.type';
import { DiscountType, VoucherCategory } from '@/types/voucher.type';
import { UserVoucherStatus } from '@/types/user-voucher.type';
import { ReferralRewardStatus, UserTier } from '@/types/user.type';
import withTransaction from '@/utils/with-transaction';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';

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

export const REFERRAL_MIN_ORDER_TOTAL = 100_000;
const REFERRER_VOUCHER_DISCOUNT = 30_000;
const REFERRER_VOUCHER_MIN_ORDER = 150_000;
const REFERRER_VOUCHER_VALID_DAYS = 30;
const INVITEE_REWARD_POINTS = 50;

const normalizePhone = (phone?: string | null) => phone?.replace(/\D/g, '') || null;

const shareDevice = async (
    firstUserId: mongoose.Types.ObjectId,
    secondUserId: mongoose.Types.ObjectId
) => {
    const tokens = await RefreshTokenModel.find({
        userId: { $in: [firstUserId, secondUserId] },
        revoked: false,
        deviceId: { $exists: true, $ne: null },
    })
        .select('userId deviceId')
        .lean();

    const firstDevices = new Set(
        tokens
            .filter((token) => token.userId.toString() === firstUserId.toString())
            .map((token) => token.deviceId)
            .filter(Boolean)
    );

    return tokens.some(
        (token) =>
            token.userId.toString() === secondUserId.toString() &&
            Boolean(token.deviceId) &&
            firstDevices.has(token.deviceId)
    );
};

const rejectPendingReferral = async (
    userId: mongoose.Types.ObjectId,
    reason: string
) => {
    await UserModel.updateOne(
        {
            _id: userId,
            referralRewardStatus: ReferralRewardStatus.PENDING,
        },
        {
            $set: {
                referralRewardStatus: ReferralRewardStatus.REJECTED,
                referralRejectionReason: reason,
            },
        }
    );
};

/**
 * Attach an inviter to an existing verified account. No points are awarded here.
 */
export const rewardReferral = async (
    userId: string | mongoose.Types.ObjectId,
    referralCode: string
) => {
    const normalizedReferralCode = referralCode.trim().toUpperCase();
    const referrer = await UserModel.findOne({
        referralCode: normalizedReferralCode,
        role: { $in: ['customer', 'CUSTOMER'] },
    }).select('_id phone');
    appAssert(referrer, BAD_REQUEST, 'Mã giới thiệu không hợp lệ');

    const newUser = await UserModel.findById(userId).select(
        'referredBy referralRewardStatus verifiedAt phone'
    );
    appAssert(newUser, NOT_FOUND, 'Người dùng không tồn tại');
    appAssert(newUser.verifiedAt, BAD_REQUEST, 'Bạn cần xác minh email trước khi dùng mã giới thiệu');
    appAssert(
        !newUser.referredBy && newUser.referralRewardStatus === ReferralRewardStatus.NONE,
        BAD_REQUEST,
        'Bạn đã dùng mã giới thiệu trước đó'
    );
    appAssert(
        referrer._id.toString() !== newUser._id.toString(),
        BAD_REQUEST,
        'Không thể tự giới thiệu chính mình'
    );

    const completedOrderExists = await OrderModel.exists({
        cusId: newUser._id,
        status: 'completed',
    });
    appAssert(
        !completedOrderExists,
        BAD_REQUEST,
        'Mã giới thiệu chỉ dành cho khách hàng chưa hoàn tất đơn nào'
    );

    const samePhone =
        normalizePhone(referrer.phone) &&
        normalizePhone(referrer.phone) === normalizePhone(newUser.phone);
    appAssert(!samePhone, BAD_REQUEST, 'Không thể dùng mã giới thiệu giữa hai tài khoản cùng số điện thoại');

    const sameDevice = await shareDevice(
        referrer._id as mongoose.Types.ObjectId,
        newUser._id as mongoose.Types.ObjectId
    );
    appAssert(!sameDevice, BAD_REQUEST, 'Không thể dùng mã giới thiệu giữa hai tài khoản cùng thiết bị');

    const attached = await UserModel.findOneAndUpdate(
        {
            _id: newUser._id,
            referredBy: null,
            referralRewardStatus: { $in: [ReferralRewardStatus.NONE, null] },
        },
        {
            $set: {
                referredBy: referrer._id,
                referralRewardStatus: ReferralRewardStatus.PENDING,
                referralRejectionReason: null,
            },
        },
        { new: true }
    );
    appAssert(attached, BAD_REQUEST, 'Mã giới thiệu đã được xử lý trước đó');

    return 'Đã ghi nhận lời mời. Điểm sẽ được cộng sau khi đơn đầu tiên từ 100.000đ hoàn tất';
};

/**
 * Unlock a pending referral once the invitee's first completed order qualifies.
 * The pending -> processing lock makes repeated completion paths idempotent.
 */
export const qualifyReferralFromCompletedOrder = async (
    orderId: string | mongoose.Types.ObjectId
) => {
    const order = await OrderModel.findById(orderId)
        .select('_id cusId status totalPrice createdAt code')
        .lean();

    if (!order || order.status !== 'completed') return { status: 'ignored' as const };

    const invitee = await UserModel.findOne({
        _id: order.cusId,
        referralRewardStatus: ReferralRewardStatus.PENDING,
        referredBy: { $ne: null },
    }).select('_id username phone verifiedAt referredBy');

    if (!invitee?.referredBy) return { status: 'ignored' as const };

    const firstCompletedOrder = await OrderModel.findOne({
        cusId: invitee._id,
        status: 'completed',
    })
        .sort({ createdAt: 1, _id: 1 })
        .select('_id')
        .lean();

    if (!firstCompletedOrder || firstCompletedOrder._id.toString() !== order._id.toString()) {
        await rejectPendingReferral(invitee._id, 'not_first_completed_order');
        return { status: 'rejected' as const, reason: 'not_first_completed_order' };
    }

    if (order.totalPrice < REFERRAL_MIN_ORDER_TOTAL) {
        await rejectPendingReferral(invitee._id, 'minimum_order_not_met');
        return { status: 'rejected' as const, reason: 'minimum_order_not_met' };
    }

    if (!invitee.verifiedAt) {
        await rejectPendingReferral(invitee._id, 'email_not_verified');
        return { status: 'rejected' as const, reason: 'email_not_verified' };
    }

    const referrer = await UserModel.findById(invitee.referredBy).select('_id username phone');
    if (!referrer) {
        await rejectPendingReferral(invitee._id, 'referrer_not_found');
        return { status: 'rejected' as const, reason: 'referrer_not_found' };
    }

    const samePhone =
        normalizePhone(referrer.phone) &&
        normalizePhone(referrer.phone) === normalizePhone(invitee.phone);
    if (samePhone) {
        await rejectPendingReferral(invitee._id, 'same_phone');
        return { status: 'rejected' as const, reason: 'same_phone' };
    }

    if (
        await shareDevice(
            referrer._id as mongoose.Types.ObjectId,
            invitee._id as mongoose.Types.ObjectId
        )
    ) {
        await rejectPendingReferral(invitee._id, 'same_device');
        return { status: 'rejected' as const, reason: 'same_device' };
    }

    const lockedInvitee = await UserModel.findOneAndUpdate(
        {
            _id: invitee._id,
            referralRewardStatus: ReferralRewardStatus.PENDING,
        },
        {
            $set: {
                referralRewardStatus: ReferralRewardStatus.PROCESSING,
                referralQualifiedOrderId: order._id,
            },
        },
        { new: true }
    );

    if (!lockedInvitee) return { status: 'ignored' as const };

    try {
        return await withTransaction(async (session) => {
            const [processingInvitee, rewardReferrer] = await Promise.all([
                UserModel.findOne({
                    _id: invitee._id,
                    referralRewardStatus: ReferralRewardStatus.PROCESSING,
                    referralQualifiedOrderId: order._id,
                }).session(session),
                UserModel.findById(referrer._id).session(session),
            ]);

            appAssert(processingInvitee, BAD_REQUEST, 'Referral không còn ở trạng thái chờ thưởng');
            appAssert(rewardReferrer, NOT_FOUND, 'Người giới thiệu không tồn tại');

            const now = new Date();
            const voucherEndAt = new Date(
                now.getTime() + REFERRER_VOUCHER_VALID_DAYS * 24 * 60 * 60 * 1000
            );
            const voucherCode =
                'REF-' +
                order._id.toString().toUpperCase();

            const referralVoucher = await VoucherModel.findOneAndUpdate(
                { code: voucherCode },
                {
                    $setOnInsert: {
                        code: voucherCode,
                        title: 'Voucher cảm ơn giới thiệu bạn bè',
                        description: 'Giảm 30.000đ cho đơn từ 150.000đ',
                        category: VoucherCategory.SPECIAL,
                        discountType: DiscountType.FIXED_AMOUNT,
                        discountValue: REFERRER_VOUCHER_DISCOUNT,
                        maxDiscount: REFERRER_VOUCHER_DISCOUNT,
                        minOrderValue: REFERRER_VOUCHER_MIN_ORDER,
                        usageLimit: 1,
                        usedCount: 0,
                        isActive: true,
                        isReward: false,
                        isPersonal: true,
                        pointCost: 0,
                        minTier: null,
                        startAt: now,
                        endAt: voucherEndAt,
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                    session,
                }
            );

            appAssert(referralVoucher, BAD_REQUEST, 'Không thể tạo voucher giới thiệu');

            await UserVoucherModel.findOneAndUpdate(
                {
                    userId: rewardReferrer._id,
                    voucherId: referralVoucher._id,
                },
                {
                    $setOnInsert: {
                        status: UserVoucherStatus.AVAILABLE,
                        claimedAt: now,
                        usedAt: null,
                        usageCount: 0,
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                    session,
                }
            );

            await PointTransactionModel.findOneAndUpdate(
                {
                    userId: processingInvitee._id,
                    type: PointTransactionType.REFERRAL,
                    orderId: order._id,
                },
                {
                    $setOnInsert: {
                        amount: INVITEE_REWARD_POINTS,
                        description:
                            'Thưởng hoàn tất đơn đầu tiên từ lời mời của ' +
                            rewardReferrer.username,
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                    session,
                }
            );

            processingInvitee.collectedPoints += INVITEE_REWARD_POINTS;
            processingInvitee.tier = calculateTier(processingInvitee.collectedPoints);
            processingInvitee.referralRewardStatus = ReferralRewardStatus.REWARDED;
            processingInvitee.referralRewardVoucherId = referralVoucher._id;
            processingInvitee.referralRewardedAt = now;
            processingInvitee.referralRejectionReason = null;
            await processingInvitee.save({ session });

            return {
                status: 'rewarded' as const,
                voucherId: referralVoucher._id.toString(),
                voucherCode,
            };
        });
    } catch (error) {
        await UserModel.updateOne(
            {
                _id: invitee._id,
                referralRewardStatus: ReferralRewardStatus.PROCESSING,
                referralQualifiedOrderId: order._id,
            },
            {
                $set: {
                    referralRewardStatus: ReferralRewardStatus.PENDING,
                    referralQualifiedOrderId: null,
                },
            }
        );
        throw error;
    }
};
