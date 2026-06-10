import { IVoucher } from '@/types';
import VoucherModel from '@/models/voucher.model';
import { VoucherCategory } from '@/types/voucher.type';
import { NOT_FOUND, BAD_REQUEST, CONFLICT } from '@/constants/http';
import appAssert from '@/utils/app-assert';
import { addPoints } from './membership.service';
import { PointTransactionType } from '@/types/point-transaction.type';
import { UserModel } from '@/models';
import mongoose from 'mongoose';

// Get all vouchers with filters
export const getAllVouchers = async (filters: {
  category?: VoucherCategory;
  isActive?: boolean;
  isReward?: boolean;
  ownerId?: string | null;
  page?: number;
  limit?: number;
}) => {
  const { category, isActive, isReward, ownerId, page = 1, limit = 10 } = filters;

  const query: any = {};

  if (category) query.category = category;
  if (isActive !== undefined) query.isActive = isActive;
  if (isReward !== undefined) query.isReward = isReward;

  if (ownerId === 'me' || ownerId === undefined) {
    // 'me' needs to be resolved by the controller passing actual userId - skip ownerId filter
  } else if (ownerId !== undefined) {
    // Include both public vouchers (ownerId null) and user's own vouchers
    query.$or = [{ ownerId: null }, { ownerId }];
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

  // Check ownership if it's a personal voucher
  if (voucher.ownerId) {
    appAssert(userId, BAD_REQUEST, 'Cần đăng nhập để sử dụng voucher cá nhân này');
    appAssert(voucher.ownerId.toString() === userId.toString(), BAD_REQUEST, 'Bạn không có quyền sử dụng voucher này');
  }

  // Check if active and not just a template
  appAssert(voucher.isActive, BAD_REQUEST, 'Voucher không còn hoạt động');
  appAssert(
    !voucher.isReward,
    BAD_REQUEST,
    'Đây là mã dùng để đổi điểm, bạn cần đổi điểm lấy mã cá nhân trước khi sử dụng'
  );

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

  // Deduct points
  await addPoints(
    userId,
    -template.pointCost,
    PointTransactionType.REDEEM,
    `Đổi ${template.pointCost} điểm lấy voucher ${template.title}`
  );

  // Create personal voucher
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newCode = `RDM-${template.discountValue}-${randomSuffix}`;

  const personalVoucher = await VoucherModel.create({
    code: newCode,
    title: template.title,
    description: template.description,
    category: template.category,
    discountType: template.discountType,
    discountValue: template.discountValue,
    maxDiscount: template.maxDiscount,
    minOrderValue: template.minOrderValue,
    usageLimit: 1, // Only 1 use
    usedCount: 0,
    isActive: true,
    isReward: false,
    pointCost: 0,
    ownerId: userId,
    startAt: new Date(),
    endAt: template.endAt,
  });

  return personalVoucher;
};
