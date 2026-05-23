import { Request, Response } from 'express';
import {
    getAllVouchers,
    getVoucherById,
    getVoucherByCode,
    createVoucher,
    updateVoucher,
    deleteVoucher,
    validateVoucher,
    useVoucher,
} from '@/services/voucher.service';
import { VoucherCategory } from '@/types/voucher.type';
import { catchErrors } from '@/utils/asyncHandler';
import { CREATED, OK } from '@/constants/http';
import appAssert from '@/utils/appAssert';
import { BAD_REQUEST } from '@/constants/http';

// GET /api/vouchers
export const getAllVouchersHandler = catchErrors(async (req: Request, res: Response) => {
    const { category, is_active, page, limit } = req.query;

    const filters = {
        category: category as VoucherCategory,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
    };

    const result = await getAllVouchers(filters);

    return res.success(OK, {
        data: result.vouchers,
        pagination: result.pagination,
    });
});

// GET /api/vouchers/:id
export const getVoucherByIdHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    const voucher = await getVoucherById(id);

    return res.success(OK, { data: voucher });
});

// GET /api/vouchers/code/:code
export const getVoucherByCodeHandler = catchErrors(async (req: Request, res: Response) => {
    const { code } = req.params;
    const voucher = await getVoucherByCode(code);

    return res.success(OK, { data: voucher });
});

// POST /api/vouchers
export const createVoucherHandler = catchErrors(async (req: Request, res: Response) => {
    const voucherData = req.body;
    const voucher = await createVoucher(voucherData);

    return res.success(CREATED, {
        data: voucher,
        message: 'Voucher đã được tạo thành công',
    });
});

// PUT /api/vouchers/:id
export const updateVoucherHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const voucher = await updateVoucher(id, updateData);

    return res.success(OK, {
        data: voucher,
        message: 'Voucher đã được cập nhật thành công',
    });
});

// DELETE /api/vouchers/:id
export const deleteVoucherHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    await deleteVoucher(id);

    return res.success(OK, {
        message: 'Voucher đã được xóa thành công',
    });
});

// POST /api/vouchers/validate
export const validateVoucherHandler = catchErrors(async (req: Request, res: Response) => {
    const { code, orderAmount, userId } = req.body;

    appAssert(code && orderAmount, BAD_REQUEST, 'Code và orderAmount là bắt buộc');

    const result = await validateVoucher(code, orderAmount, userId);

    return res.success(OK, {
        data: {
            voucher: result.voucher,
            discountAmount: result.discountAmount,
            finalAmount: result.finalAmount,
        },
    });
});

// POST /api/vouchers/:id/use
export const useVoucherHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    const voucher = await useVoucher(id);

    return res.success(OK, {
        data: voucher,
        message: 'Voucher đã được sử dụng thành công',
    });
});
