import { Request, Response } from 'express';
import { OK } from '@/constants/http';
import { PointTransactionModel, UserModel, UserVoucherModel } from '@/models';
import * as membershipService from '@/services/membership.service';
import appAssert from '@/utils/app-assert';
import { NOT_FOUND, BAD_REQUEST } from '@/constants/http';
import { catchErrors } from '@/utils/async-handler';
import { randomBytes } from 'crypto';

/**
 * Get current user's point transactions
 */
export const getMyPointsHistoryHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || 20;

    const transactions = await PointTransactionModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(OK).json({ success: true, data: transactions });
});

/**
 * Get current user's membership info (tier, points, referral code)
 */
export const getMyMembershipHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;
    const user = await UserModel.findById(userId).select('collectedPoints tier referralCode referredBy referralRewardStatus referralQualifiedOrderId referralRewardVoucherId referralRewardedAt referralRejectionReason');
    appAssert(user, NOT_FOUND, 'Người dùng không tồn tại');

    // Backfill referral codes for accounts created before the referral feature.
    if (!user.referralCode) {
        user.referralCode = 'FOODIE-' + randomBytes(6).toString('hex').toUpperCase();
        await user.save();
    }

    // Fetch all redeemed voucher IDs for this user
    const userVouchers = await UserVoucherModel.find({ userId }).select('voucherId').lean();
    const redeemedVoucherIds = userVouchers.map(uv => uv.voucherId.toString());

    return res.status(OK).json({
        success: true,
        data: {
            ...user.toObject(),
            redeemedVoucherIds
        }
    });
});

/**
 * Claim a referral code
 */
export const claimReferralHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;
    const code = req.body?.code;

    appAssert(typeof code === 'string' && code.trim(), BAD_REQUEST, 'Mã giới thiệu là bắt buộc');

    const result = await membershipService.rewardReferral(userId, code.trim());

    return res.status(OK).json({ success: true, message: result });
});
