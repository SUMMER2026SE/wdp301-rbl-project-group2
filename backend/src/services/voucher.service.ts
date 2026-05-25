import { IVoucher } from '@/types';
import VoucherModel from '@/models/voucher.model';
import { VoucherCategory } from '@/types/voucher.type';
import { NOT_FOUND, BAD_REQUEST, CONFLICT } from '@/constants/http';
import appAssert from '@/utils/app-assert';

// Get all vouchers with filters
export const getAllVouchers = async (filters: {
    category?: VoucherCategory;
    isActive?: boolean;
    page?: number;
    limit?: number;
}) => {
    const { category, isActive, page = 1, limit = 10 } = filters;

    const query: any = {};

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive;

    // Only get vouchers that haven't expired
    query.endAt = { $gte: new Date() };

    const skip = (page - 1) * limit;

    const [vouchers, total] = await Promise.all([
        VoucherModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
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
        code: code.toUpperCase()
    }).lean();

    appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
    return voucher;
};

// Create new voucher
export const createVoucher = async (voucherData: Partial<IVoucher>) => {
    // Check if code already exists
    const existingVoucher = await VoucherModel.findOne({
        code: voucherData.code?.toUpperCase()
    });

    appAssert(!existingVoucher, CONFLICT, 'Mã voucher đã tồn tại');

    const voucher = new VoucherModel(voucherData);
    await voucher.save();

    return voucher;
};

// Update voucher
export const updateVoucher = async (id: string, updateData: Partial<IVoucher>) => {
    const voucher = await VoucherModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
    return voucher;
};

// Delete voucher (soft delete by setting isActive to false)
export const deleteVoucher = async (id: string) => {
    const voucher = await VoucherModel.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
    );

    appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
    return voucher;
};

// Validate voucher for use
export const validateVoucher = async (code: string, orderAmount: number, userId?: string) => {
    const voucher = await VoucherModel.findOne({
        code: code.toUpperCase()
    });

    appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');

    // Check if active
    appAssert(voucher.isActive, BAD_REQUEST, 'Voucher không còn hoạt động');

    // Check date validity
    const now = new Date();
    appAssert(voucher.startAt <= now, BAD_REQUEST, 'Voucher chưa có hiệu lực');
    appAssert(voucher.endAt >= now, BAD_REQUEST, 'Voucher đã hết hạn');

    // Check total usage limit
    if (voucher.usageLimit !== null &&
        voucher.usedCount >= voucher.usageLimit) {
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
        finalAmount: orderAmount - discountAmount
    };
};

// Use voucher (increment usage count)
export const useVoucher = async (voucherId: string) => {
    const voucher = await VoucherModel.findByIdAndUpdate(
        voucherId,
        { $inc: { usedCount: 1 } },
        { new: true }
    );

    appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
    return voucher;
};
