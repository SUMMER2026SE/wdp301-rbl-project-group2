import mongoose from 'mongoose';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND } from '@/constants/http';
import VoucherModel from '@/models/voucher.model';
import UserModel from '@/models/user.model';
import { OrderModel, PointTransactionModel, UserVoucherModel } from '@/models';
import appAssert from '@/utils/app-assert';
import {
  DiscountType,
  IVoucher,
  ValidateVoucherOptions,
  ValidateVoucherResult,
  VoucherCategory,
} from '@/types/voucher.type';
import { UserTier } from '@/types/user.type';
import { UserVoucherStatus } from '@/types';
import { PointTransactionType } from '@/types/point-transaction.type';
import withTransaction from '@/utils/with-transaction';

const tierRank: Record<string, number> = {
  bronze: 1,
  dong: 1,
  silver: 2,
  bac: 2,
  gold: 3,
  vang: 3,
  platinum: 4,
  'bach kim': 4,
  diamond: 5,
  'kim cuong': 5,
};

const normalizeText = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getTierRank = (tier?: UserTier | string | null) => tierRank[normalizeText(tier)] || 0;

const getNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const assertVoucherDiscountConfiguration = (data: Partial<IVoucher>) => {
  const discountValue = getNumber(data.discountValue, Number.NaN);

  appAssert(
    data.discountType === DiscountType.PERCENTAGE || data.discountType === DiscountType.FIXED_AMOUNT,
    BAD_REQUEST,
    'Loại giảm giá không hợp lệ'
  );
  appAssert(Number.isFinite(discountValue) && discountValue > 0, BAD_REQUEST, 'Giá trị giảm phải lớn hơn 0');

  if (data.discountType === DiscountType.PERCENTAGE) {
    appAssert(discountValue <= 100, BAD_REQUEST, 'Phần trăm giảm không được vượt quá 100%');
  }
};

const assertRewardVoucherConfiguration = (data: Partial<IVoucher>) => {
  if (!data.isReward) return;

  const pointCost = getNumber(data.pointCost, Number.NaN);
  appAssert(Number.isFinite(pointCost) && pointCost > 0, BAD_REQUEST, 'Voucher đổi điểm phải có giá điểm lớn hơn 0');
};
const normalizeValidateOptions = (
  options?: ValidateVoucherOptions | string | mongoose.Types.ObjectId | null
): ValidateVoucherOptions => {
  if (!options) return {};

  if (typeof options === 'string' || options instanceof mongoose.Types.ObjectId) {
    return {
      userId: options.toString(),
    };
  }

  return options;
};

const resolveUserTier = async (options?: ValidateVoucherOptions) => {
  if (options?.userId && mongoose.Types.ObjectId.isValid(String(options.userId))) {
    const user = await UserModel.findById(options.userId).select('tier userTier rank memberTier').lean();

    return (
      (user as any)?.tier ||
      (user as any)?.userTier ||
      (user as any)?.rank ||
      (user as any)?.memberTier ||
      options.userTier ||
      null
    );
  }

  return options?.userTier || null;
};

const assertVoucherCanBeUsed = async (voucher: IVoucher, orderAmount: number, options?: ValidateVoucherOptions) => {
  const now = new Date();

  appAssert(voucher.isActive, BAD_REQUEST, 'Voucher đã bị vô hiệu hóa');

  appAssert(voucher.startAt <= now, BAD_REQUEST, 'Voucher chưa đến thời gian sử dụng');

  appAssert(voucher.endAt >= now, BAD_REQUEST, 'Voucher đã hết hạn');

  appAssert(orderAmount >= getNumber(voucher.minOrderValue), BAD_REQUEST, 'Đơn hàng chưa đạt giá trị tối thiểu');

  if (voucher.usageLimit && voucher.usageLimit > 0) {
    appAssert(voucher.usedCount < voucher.usageLimit, BAD_REQUEST, 'Voucher đã hết lượt sử dụng');
  }

  const normalizedUserId = options?.userId?.toString();
  const hasValidUserId = Boolean(normalizedUserId && mongoose.Types.ObjectId.isValid(normalizedUserId));

  if (voucher.isPersonal || voucher.isReward) {
    appAssert(hasValidUserId, FORBIDDEN, 'Bạn cần đăng nhập để sử dụng voucher này');

    const ownedVoucher = await UserVoucherModel.exists({
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      voucherId: voucher._id,
      status: UserVoucherStatus.AVAILABLE,
    });
    appAssert(ownedVoucher, FORBIDDEN, 'Bạn không sở hữu hoặc đã sử dụng voucher này');
  }

  if (hasValidUserId) {
    const usedInOrder = await OrderModel.exists({
      cusId: new mongoose.Types.ObjectId(normalizedUserId),
      voucherId: voucher._id,
      status: { $ne: 'cancelled' },
    });
    appAssert(!usedInOrder, BAD_REQUEST, 'Bạn đã sử dụng voucher này rồi');
  }

  if (voucher.minTier) {
    const userTier = await resolveUserTier(options);

    appAssert(userTier, FORBIDDEN, 'Vui lòng đăng nhập để dùng voucher theo hạng thành viên');

    appAssert(
      getTierRank(userTier) >= getTierRank(voucher.minTier),
      FORBIDDEN,
      `Voucher chỉ áp dụng từ hạng ${voucher.minTier}`
    );
  }
};

const calculateVoucherDiscount = (voucher: IVoucher, orderAmount: number, options?: ValidateVoucherOptions) => {
  const shippingFee = getNumber(options?.shippingFee ?? options?.deliveryFee, 0);

  const isFreeshipVoucher = voucher.category === VoucherCategory.FREESHIP;

  const discountBase = isFreeshipVoucher ? shippingFee : orderAmount;

  let discountAmount = 0;

  if (voucher.discountType === DiscountType.PERCENTAGE) {
    discountAmount = Math.floor((discountBase * getNumber(voucher.discountValue)) / 100);
  }

  if (voucher.discountType === DiscountType.FIXED_AMOUNT) {
    discountAmount = getNumber(voucher.discountValue);
  }

  if (voucher.maxDiscount && voucher.maxDiscount > 0) {
    discountAmount = Math.min(discountAmount, voucher.maxDiscount);
  }

  if (isFreeshipVoucher) {
    discountAmount = Math.min(discountAmount, shippingFee);
  } else {
    discountAmount = Math.min(discountAmount, orderAmount);
  }

  const finalAmount = Math.max(0, orderAmount + shippingFee - discountAmount);

  return {
    discountAmount,
    finalAmount,
  };
};

export const getAllVouchers = async (
  filters: {
    category?: VoucherCategory;
    isActive?: boolean;
    isReward?: boolean;
    ownerId?: string;
    includeExpired?: boolean;
    adminView?: boolean;
    page?: number;
    limit?: number;
  } = {},
  userId?: string
) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 20);
  const skip = (page - 1) * limit;
  const query: Record<string, any> = {};

  if (filters.category) query.category = filters.category;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  if (filters.adminView) {
    if (filters.isReward !== undefined) {
      query.isReward = filters.isReward;
    }

    if (filters.ownerId && mongoose.Types.ObjectId.isValid(filters.ownerId)) {
      query.ownerId = new mongoose.Types.ObjectId(filters.ownerId);
    }
  } else if (filters.isReward === true) {
    query.isReward = true;
  } else {
    const targetUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;

    if (targetUserId) {
      const user = await UserModel.findById(targetUserId).select('tier').lean();
      const userTierRank = getTierRank(user?.tier || UserTier.BRONZE);
      const allowedTiers = Object.values(UserTier).filter((tier) => getTierRank(tier) <= userTierRank);

      const [ownedVouchers, usedOrders] = await Promise.all([
        UserVoucherModel.find({
          userId: new mongoose.Types.ObjectId(targetUserId),
          status: UserVoucherStatus.AVAILABLE,
        })
          .select('voucherId')
          .lean(),

        OrderModel.find({
          cusId: new mongoose.Types.ObjectId(targetUserId),
          status: { $ne: 'cancelled' },
          voucherId: { $ne: null },
        })
          .select('voucherId')
          .lean(),
      ]);

      const ownedVoucherIds = ownedVouchers.map((item) => item.voucherId);
      const usedVoucherIds = usedOrders.map((order) => order.voucherId).filter(Boolean);

      query.minTier = { $in: [null, ...allowedTiers] };
      query.$and = [
        {
          $or: [{ _id: { $in: ownedVoucherIds } }, { isReward: { $ne: true }, isPersonal: { $ne: true } }],
        },
      ];

      if (usedVoucherIds.length > 0) {
        query.$and.push({ _id: { $nin: usedVoucherIds } });
      }
    } else {
      query.isReward = filters.isReward ?? { $ne: true };
      query.isPersonal = { $ne: true };
    }
  }

  if (!filters.includeExpired) {
    query.endAt = { $gte: new Date() };
  }

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

export const getVoucherById = async (id: string) => {
  const trimmed = id.trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const voucher = await VoucherModel.findById(trimmed);
    if (voucher) return voucher;
  }

  return getVoucherByCode(trimmed);
};

export const getVoucherByCode = async (code: string) => {
  const voucher = await VoucherModel.findOne({
    code: code.trim().toUpperCase(),
  });

  appAssert(voucher, NOT_FOUND, 'Không tìm thấy voucher');

  return voucher;
};

export const createVoucher = async (data: Partial<IVoucher>) => {
  appAssert(data.code, BAD_REQUEST, 'Mã voucher là bắt buộc');
  appAssert(data.title, BAD_REQUEST, 'Tên voucher là bắt buộc');
  appAssert(data.description, BAD_REQUEST, 'Mô tả voucher là bắt buộc');
  assertVoucherDiscountConfiguration(data);
  assertRewardVoucherConfiguration(data);

  const existed = await VoucherModel.findOne({
    code: String(data.code).trim().toUpperCase(),
  });

  appAssert(!existed, BAD_REQUEST, 'Mã voucher đã tồn tại');

  const startAt = data.startAt ? new Date(data.startAt) : null;
  const endAt = data.endAt ? new Date(data.endAt) : null;

  appAssert(startAt, BAD_REQUEST, 'Ngày bắt đầu là bắt buộc');
  appAssert(endAt, BAD_REQUEST, 'Ngày kết thúc là bắt buộc');
  appAssert(startAt < endAt, BAD_REQUEST, 'Ngày kết thúc phải sau ngày bắt đầu');

  const voucher = await VoucherModel.create({
    ...data,
    code: String(data.code).trim().toUpperCase(),
    minTier: data.minTier || null,
    maxDiscount: data.maxDiscount || null,
    usageLimit: data.usageLimit === undefined || data.usageLimit === null ? null : Number(data.usageLimit),
    usedCount: 0,
  });

  return voucher;
};

export const updateVoucher = async (id: string, data: Partial<IVoucher>) => {
  appAssert(mongoose.Types.ObjectId.isValid(id), BAD_REQUEST, 'Voucher ID không hợp lệ');

  const currentVoucher = await VoucherModel.findById(id);

  appAssert(currentVoucher, NOT_FOUND, 'Không tìm thấy voucher');

  assertVoucherDiscountConfiguration({
    discountType: data.discountType ?? currentVoucher.discountType,
    discountValue: data.discountValue ?? currentVoucher.discountValue,
  });
  assertRewardVoucherConfiguration({
    isReward: data.isReward ?? currentVoucher.isReward,
    pointCost: data.pointCost ?? currentVoucher.pointCost,
  });

  if (data.code) {
    const duplicated = await VoucherModel.findOne({
      _id: { $ne: id },
      code: String(data.code).trim().toUpperCase(),
    });

    appAssert(!duplicated, BAD_REQUEST, 'Mã voucher đã tồn tại');

    data.code = String(data.code).trim().toUpperCase();
  }

  if (data.startAt && data.endAt) {
    appAssert(new Date(data.startAt) < new Date(data.endAt), BAD_REQUEST, 'Ngày kết thúc phải sau ngày bắt đầu');
  }

  const voucher = await VoucherModel.findByIdAndUpdate(
    id,
    {
      ...data,
      minTier: data.minTier || null,
      maxDiscount: data.maxDiscount || null,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  appAssert(voucher, NOT_FOUND, 'Không tìm thấy voucher');

  return voucher;
};

export const deleteVoucher = async (id: string) => {
  appAssert(mongoose.Types.ObjectId.isValid(id), BAD_REQUEST, 'Voucher ID không hợp lệ');

  const voucher = await VoucherModel.findByIdAndDelete(id);

  appAssert(voucher, NOT_FOUND, 'Không tìm thấy voucher');

  return voucher;
};

export const validateVoucher = async (
  code: string,
  orderAmount: number,
  options?: ValidateVoucherOptions | string | mongoose.Types.ObjectId | null
): Promise<ValidateVoucherResult> => {
  appAssert(code, BAD_REQUEST, 'Mã voucher là bắt buộc');
  appAssert(orderAmount >= 0, BAD_REQUEST, 'Giá trị đơn hàng không hợp lệ');

  const normalizedOptions = normalizeValidateOptions(options);

  const voucher = await getVoucherByCode(code);

  await assertVoucherCanBeUsed(voucher, orderAmount, normalizedOptions);

  const { discountAmount, finalAmount } = calculateVoucherDiscount(voucher, orderAmount, normalizedOptions);

  if (discountAmount <= 0) {
    const isFreeshipVoucher = voucher.category === VoucherCategory.FREESHIP;
    const shippingFee = getNumber(normalizedOptions.shippingFee ?? normalizedOptions.deliveryFee, 0);

    appAssert(!(isFreeshipVoucher && shippingFee <= 0), BAD_REQUEST, 'Đơn hàng này đã được miễn phí vận chuyển');
    appAssert(
      getNumber(voucher.discountValue) > 0 && voucher.discountType !== DiscountType.NONE,
      BAD_REQUEST,
      'Voucher có cấu hình giảm giá không hợp lệ'
    );
    appAssert(false, BAD_REQUEST, 'Voucher không áp dụng được cho giá trị đơn hàng này');
  }

  return {
    voucher,
    discountAmount,
    finalAmount,
  };
};

export const useVoucher = async (id: string, session?: mongoose.ClientSession) => {
  const voucher = await VoucherModel.findById(id).session(session || null);

  appAssert(voucher, NOT_FOUND, 'Không tìm thấy voucher');

  if (voucher.usageLimit && voucher.usageLimit > 0) {
    appAssert(voucher.usedCount < voucher.usageLimit, BAD_REQUEST, 'Voucher đã hết lượt sử dụng');
  }

  voucher.usedCount += 1;
  await voucher.save({ session });

  return voucher;
};

export const redeemRewardVoucher = async (id: string, userId: mongoose.Types.ObjectId | string) => {
  appAssert(mongoose.Types.ObjectId.isValid(String(userId)), BAD_REQUEST, 'Người dùng không hợp lệ');

  return withTransaction(async (session) => {
    const voucher = await VoucherModel.findById(id).session(session);
    appAssert(voucher, NOT_FOUND, 'Không tìm thấy voucher');
    appAssert(voucher.isReward, BAD_REQUEST, 'Voucher này không phải voucher đổi điểm');
    appAssert(voucher.isActive, BAD_REQUEST, 'Voucher đã bị vô hiệu hóa');

    const now = new Date();
    appAssert(voucher.startAt <= now, BAD_REQUEST, 'Voucher chưa đến thời gian sử dụng');
    appAssert(voucher.endAt >= now, BAD_REQUEST, 'Voucher đã hết hạn');

    const pointCost = getNumber(voucher.pointCost);
    appAssert(pointCost > 0, BAD_REQUEST, 'Voucher đổi điểm phải có giá điểm lớn hơn 0');

    const normalizedUserId = new mongoose.Types.ObjectId(String(userId));
    const user = await UserModel.findById(normalizedUserId).select('collectedPoints accumulatedPoints tier').session(session);
    appAssert(user, NOT_FOUND, 'Không tìm thấy người dùng');

    if (voucher.minTier) {
      appAssert(
        getTierRank(user.tier) >= getTierRank(voucher.minTier),
        FORBIDDEN,
        `Voucher chỉ áp dụng từ hạng ${voucher.minTier}`
      );
    }

    const alreadyRedeemed = await UserVoucherModel.exists({ userId: normalizedUserId, voucherId: voucher._id }).session(session);
    appAssert(!alreadyRedeemed, BAD_REQUEST, 'Bạn đã đổi voucher này rồi');

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: normalizedUserId, collectedPoints: { $gte: pointCost } },
      { $inc: { collectedPoints: -pointCost } },
      { new: true, session }
    );
    appAssert(updatedUser, BAD_REQUEST, 'Bạn không đủ điểm để đổi voucher');

    await UserVoucherModel.create(
      [
        {
          userId: normalizedUserId,
          voucherId: voucher._id,
          status: UserVoucherStatus.AVAILABLE,
        },
      ],
      { session }
    );

    await PointTransactionModel.create(
      [
        {
          userId: normalizedUserId,
          amount: -pointCost,
          type: PointTransactionType.REDEEM,
          description: `Đổi ${pointCost} điểm lấy voucher ${voucher.code}`,
          orderId: null,
        },
      ],
      { session }
    );

    return voucher;
  });
};
