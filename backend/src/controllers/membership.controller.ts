import { Request, Response } from 'express';
import { OK } from '@/constants/http';
import { PointTransactionModel, UserModel } from '@/models';
import * as membershipService from '@/services/membership.service';
import appAssert from '@/utils/appAssert';
import { NOT_FOUND, BAD_REQUEST } from '@/constants/http';
import { catchErrors } from '@/utils/asyncHandler';

/**
 * Get current user's point transactions
 */
export const getMyPointsHistoryHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || 20;

    const transactions = await PointTransactionModel.find({ user_id: userId })
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
    const user = await UserModel.findById(userId).select('collected_points tier referral_code referred_by');
    appAssert(user, NOT_FOUND, 'Người dùng không tồn tại');

    return res.status(OK).json({ success: true, data: user });
});

/**
 * Claim a referral code
 */
export const claimReferralHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;
    const { code } = req.body;

    appAssert(code, BAD_REQUEST, 'Mã giới thiệu là bắt buộc');

    const result = await membershipService.rewardReferral(userId, code);

    return res.status(OK).json({ success: true, message: result });
});
