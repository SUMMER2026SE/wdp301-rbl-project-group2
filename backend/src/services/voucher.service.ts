import { IVoucher, UserVoucherStatus } from '@/types';
import VoucherModel from '@/models/voucher.model';
import { VoucherCategory } from '@/types/voucher.type';
import { UserTier } from '@/types/user.type';
import { NOT_FOUND, BAD_REQUEST, CONFLICT } from '@/constants/http';
import appAssert from '@/utils/app-assert';
import { addPoints } from './membership.service';
import { PointTransactionType } from '@/types/point-transaction.type';
import { UserModel, UserVoucherModel } from '@/models';
import mongoose from 'mongoose';

const TIER_ORDER = [
    UserTier.BRONZE,
    UserTier.SILVER,
    UserTier.GOLD,
    UserTier.PLATINUM,
    UserTier.DIAMOND
];

export const isTierAtLeast = (userTier: UserTier, minTier: UserTier): boolean => {
    const userIndex = TIER_ORDER.indexOf(userTier);
    const minIndex = TIER_ORDER.indexOf(minTier);
    return userIndex >= minIndex;
};

// Get all vouchers with filters
export const getAllVouchers = async (filters: {
    category?: VoucherCategory;
    isActive?: boolean;
    isReward?: boolean;
    ownerId?: string | null;
    page?: number;
    limit?: number;
}, currentUserId?: string) => {
    const { category, isActive, isReward, ownerId, page = 1, limit = 10 } = filters;

  const query: any = {};

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive;

    const LEGACY_PUBLIC_VOUCHERS = ['WELCOME100', 'SHIP0D'];

    if (isReward === true) {
        query.isReward = true;
    } else {
        const targetUserId = (ownerId && ownerId !== 'me') ? ownerId : currentUserId;

        // Fetch user tier if available
        let userTier = UserTier.BRONZE;
        const fetchTierUserId = targetUserId || currentUserId;
        if (fetchTierUserId) {
            const user = await UserModel.findById(fetchTierUserId).lean();
            if (user) userTier = user.tier || UserTier.BRONZE;
        }

        const allowedTiers = TIER_ORDER.slice(0, TIER_ORDER.indexOf(userTier) + 1);
        query.minTier = { $in: [null, ...allowedTiers] };

        if (targetUserId) {
            const userVouchers = await UserVoucherModel.find({
                userId: new mongoose.Types.ObjectId(targetUserId),
                status: UserVoucherStatus.AVAILABLE,
            }).lean();
            const claimedVoucherIds = userVouchers.map((uv) => uv.voucherId);

            query.$or = [
                { _id: { $in: claimedVoucherIds } },
                { 
                    code: { $in: LEGACY_PUBLIC_VOUCHERS },
                    isReward: { $ne: true }
                }
            ];
        } else {
            // No userId — return all non-reward vouchers (admin browsing, unauthenticated, etc.)
            if (isReward === false) {
                query.isReward = false;
            } else {
                query.isReward = { $ne: true };
            }
        }
    }

  // Only get vouchers that haven't expired
  query.endAt = { $gte: new Date() };

  const skip = (page - 1) * limit;

  const [vouchers, total] = await Promise.all([
    VoucherModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    VoucherModel.countDocuments(query),
  ]);

  return {
    vouchers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get voucher by ID
export const getVoucherById = async (id: string) => {
  const voucher = await VoucherModel.findById(id).lean();
  appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
  return voucher;
};

// Get voucher by code
export const getVoucherByCode = async (code: string) => {
  const voucher = await VoucherModel.findOne({
    code: code.toUpperCase(),
  }).lean();

  appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
  return voucher;
};

// Create new voucher
export const createVoucher = async (voucherData: Partial<IVoucher>) => {
  // Check if code already exists
  const existingVoucher = await VoucherModel.findOne({
    code: voucherData.code?.toUpperCase(),
  });

  appAssert(!existingVoucher, CONFLICT, 'Mã voucher đã tồn tại');

  const voucher = new VoucherModel(voucherData);
  await voucher.save();

  return voucher;
};

// Update voucher
export const updateVoucher = async (id: string, updateData: Partial<IVoucher>) => {
  const voucher = await VoucherModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

  appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
  return voucher;
};

// Delete voucher permanently from the voucher inventory
export const deleteVoucher = async (id: string) => {
  const voucher = await VoucherModel.findByIdAndDelete(id);

  appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
  return voucher;
};

// Validate voucher for use
export const validateVoucher = async (code: string, orderAmount: number, userId?: string) => {
  const voucher = await VoucherModel.findOne({
    code: code.toUpperCase(),
  });

  appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');

  const LEGACY_PUBLIC_VOUCHERS = ['WELCOME100', 'SHIP0D'];
  const isPublic = LEGACY_PUBLIC_VOUCHERS.includes(voucher.code.toUpperCase());

  if (!isPublic) {
    appAssert(!voucher.isReward, BAD_REQUEST, 'Voucher này yêu cầu đổi bằng điểm để sử dụng, không thể áp dụng trực tiếp');
    appAssert(userId, BAD_REQUEST, 'Cần đăng nhập để sử dụng voucher cá nhân này');
    
    const userVoucher = await UserVoucherModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        voucherId: voucher._id,
        status: UserVoucherStatus.AVAILABLE,
    });
    appAssert(userVoucher, BAD_REQUEST, 'Bạn không sở hữu hoặc đã sử dụng voucher này');
  }

  // Check tier restrictions
  if (voucher.minTier) {
      appAssert(userId, BAD_REQUEST, 'Cần đăng nhập để sử dụng voucher này');
      const user = await UserModel.findById(userId);
      appAssert(user, NOT_FOUND, 'Người dùng không tồn tại');
      const userTier = user.tier || UserTier.BRONZE;
      appAssert(
          isTierAtLeast(userTier, voucher.minTier),
          BAD_REQUEST,
          `Voucher này yêu cầu hạng thành viên tối thiểu là ${voucher.minTier}`
      );
  }

  // Check if active and not just a template
  appAssert(voucher.isActive, BAD_REQUEST, 'Voucher không còn hoạt động');
  appAssert(!voucher.isReward, BAD_REQUEST, 'Đây là mã dùng để đổi điểm, bạn cần đổi điểm lấy mã cá nhân trước khi sử dụng');

  // Check date validity
  const now = new Date();
  appAssert(voucher.startAt <= now, BAD_REQUEST, 'Voucher chưa có hiệu lực');
  appAssert(voucher.endAt >= now, BAD_REQUEST, 'Voucher đã hết hạn');

  // Check total usage limit
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
      appAssert(false, BAD_REQUEST, 'Voucher đã hết lượt sử dụng');
  }

  // Check minimum order amount
  appAssert(
      orderAmount >= voucher.minOrderValue,
      BAD_REQUEST,
      `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()}đ`
  );

  // Calculate discount
  let discountAmount = 0;
  if (voucher.discountType === 'fixed_amount') {
      discountAmount = voucher.discountValue;
  } else if (voucher.discountType === 'percentage') {
      discountAmount = (orderAmount * voucher.discountValue) / 100;
      if (voucher.maxDiscount) {
          discountAmount = Math.min(discountAmount, voucher.maxDiscount);
      }
  }

  return {
    voucher,
    discountAmount,
    finalAmount: orderAmount - discountAmount,
  };
};

// Use voucher (increment usage count)
export const useVoucher = async (voucherId: string) => {
  const voucher = await VoucherModel.findByIdAndUpdate(voucherId, { $inc: { usedCount: 1 } }, { new: true });

  appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
  return voucher;
};

// Redeem a reward voucher using points
export const redeemRewardVoucher = async (voucherId: string, userId: mongoose.Types.ObjectId) => {
  const template = await VoucherModel.findById(voucherId);
  appAssert(template, NOT_FOUND, 'Voucher mẫu không tồn tại');
  appAssert(template.isReward, BAD_REQUEST, 'Voucher này không thể đổi bằng điểm');
  appAssert(template.isActive, BAD_REQUEST, 'Voucher này đã ngừng hỗ trợ đổi điểm');
  appAssert(template.pointCost && template.pointCost > 0, BAD_REQUEST, 'Voucher không có cấu hình điểm đổi');

  const user = await UserModel.findById(userId);
  appAssert(user, NOT_FOUND, 'Người dùng không tồn tại');
  appAssert(user.collectedPoints >= template.pointCost, BAD_REQUEST, 'Bạn không đủ điểm để đổi voucher này');

    // Check if user has already claimed this voucher template
    const alreadyClaimed = await UserVoucherModel.findOne({
        userId,
        voucherId: template._id,
    });
    appAssert(!alreadyClaimed, BAD_REQUEST, 'Bạn đã đổi voucher này rồi');

    // Enforce tier restriction for reward templates
    if (template.minTier) {
        const userTier = user.tier || UserTier.BRONZE;
        appAssert(
            isTierAtLeast(userTier, template.minTier),
            BAD_REQUEST,
            `Voucher này yêu cầu hạng thành viên tối thiểu là ${template.minTier}`
        );
    }

    // Deduct points
    await addPoints(
        userId,
        -template.pointCost,
        PointTransactionType.REDEEM,
        `Đổi ${template.pointCost} điểm lấy voucher ${template.title}`
    );

    // Link the user with this voucher template in user_vouchers
    await UserVoucherModel.create({
        userId,
        voucherId: template._id,
        status: UserVoucherStatus.AVAILABLE,
        claimedAt: new Date(),
        usedAt: null,
        usageCount: 0,
    });

    return template;
};
