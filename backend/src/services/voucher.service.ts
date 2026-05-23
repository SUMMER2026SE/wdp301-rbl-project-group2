import { IVoucher } from '@/types';
import VoucherModel from '@/models/voucher.model';
import { VoucherCategory } from '@/types/voucher.type';
import { NOT_FOUND, BAD_REQUEST, CONFLICT } from '@/constants/http';
import appAssert from '@/utils/appAssert';

// Get all vouchers with filters
export const getAllVouchers = async (filters: {
    category?: VoucherCategory;
    is_active?: boolean;
    page?: number;
    limit?: number;
}) => {
    const { category, is_active, page = 1, limit = 10 } = filters;

    const query: any = {};

    if (category) query.category = category;
    if (is_active !== undefined) query.is_active = is_active;

    // Only get vouchers that haven't expired
    query.end_date = { $gte: new Date() };

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

// Delete voucher (soft delete by setting is_active to false)
export const deleteVoucher = async (id: string) => {
    const voucher = await VoucherModel.findByIdAndUpdate(
        id,
        { $set: { is_active: false } },
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
    appAssert(voucher.is_active, BAD_REQUEST, 'Voucher không còn hoạt động');

    // Check date validity
    const now = new Date();
    appAssert(voucher.start_date <= now, BAD_REQUEST, 'Voucher chưa có hiệu lực');
    appAssert(voucher.end_date >= now, BAD_REQUEST, 'Voucher đã hết hạn');

    // Check total usage limit
    if (voucher.total_usage_limit !== null &&
        voucher.current_usage_count >= voucher.total_usage_limit) {
        appAssert(false, BAD_REQUEST, 'Voucher đã hết lượt sử dụng');
    }

    // Check minimum order amount
    appAssert(
        orderAmount >= voucher.min_order_amount,
        BAD_REQUEST,
        `Đơn hàng tối thiểu ${voucher.min_order_amount.toLocaleString()}đ`
    );

    // Calculate discount
    let discountAmount = 0;
    if (voucher.discount_type === 'fixed_amount') {
        discountAmount = voucher.discount_value;
    } else if (voucher.discount_type === 'percentage') {
        discountAmount = (orderAmount * voucher.discount_value) / 100;
        if (voucher.max_discount_amount) {
            discountAmount = Math.min(discountAmount, voucher.max_discount_amount);
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
        { $inc: { current_usage_count: 1 } },
        { new: true }
    );

    appAssert(voucher, NOT_FOUND, 'Voucher không tồn tại');
    return voucher;
};
