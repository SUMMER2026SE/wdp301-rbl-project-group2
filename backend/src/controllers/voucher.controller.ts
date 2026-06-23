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
  redeemRewardVoucher,
} from '@/services/voucher.service';
import { VoucherCategory } from '@/types/voucher.type';
import { catchErrors } from '@/utils/async-handler';
import { BAD_REQUEST, CREATED, OK } from '@/constants/http';
import appAssert from '@/utils/app-assert';

export const getAllVouchersHandler = catchErrors(async (req: Request, res: Response) => {
  const { category, isActive, isReward, ownerId, includeExpired, adminView, page, limit } = req.query;

  const role = (req as any).role;
  const isAdminView = adminView === 'true' && ['admin', 'manager'].includes(String(role));

  const filters = {
    category: category as VoucherCategory,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    isReward: isReward === 'true' ? true : isReward === 'false' ? false : undefined,
    ownerId: ownerId as string | undefined,
    includeExpired: includeExpired === 'true',
    adminView: isAdminView,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  };

  const result = await getAllVouchers(filters, isAdminView ? undefined : req.userId?.toString());

  return res.success(OK, {
    data: result.vouchers,
    pagination: result.pagination,
  });
});

export const getVoucherByIdHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;

  const voucher = await getVoucherById(id);

  return res.success(OK, {
    data: voucher,
  });
});

export const getVoucherByCodeHandler = catchErrors(async (req: Request, res: Response) => {
  const { code } = req.params;

  const voucher = await getVoucherByCode(code);

  return res.success(OK, {
    data: voucher,
  });
});

export const createVoucherHandler = catchErrors(async (req: Request, res: Response) => {
  const voucher = await createVoucher(req.body);

  return res.success(CREATED, {
    data: voucher,
    message: 'Voucher đã được tạo thành công',
  });
});

export const updateVoucherHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;

  const voucher = await updateVoucher(id, req.body);

  return res.success(OK, {
    data: voucher,
    message: 'Voucher đã được cập nhật thành công',
  });
});

export const deleteVoucherHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;

  await deleteVoucher(id);

  return res.success(OK, {
    message: 'Voucher đã được xóa thành công',
  });
});

export const validateVoucherHandler = catchErrors(async (req: Request, res: Response) => {
  const { code, orderAmount, userId: bodyUserId, userTier, shippingFee, deliveryFee } = req.body;

  appAssert(code && orderAmount !== undefined && orderAmount !== null, BAD_REQUEST, 'Code và orderAmount là bắt buộc');

  const activeUserId = req.userId || bodyUserId;

  const result = await validateVoucher(code, Number(orderAmount), {
    userId: activeUserId?.toString(),
    userTier,
    shippingFee: Number(shippingFee ?? deliveryFee ?? 0),
    deliveryFee: Number(deliveryFee ?? shippingFee ?? 0),
  });

  return res.success(OK, {
    data: {
      voucher: result.voucher,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
    },
  });
});

export const useVoucherHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;

  const voucher = await useVoucher(id);

  return res.success(OK, {
    data: voucher,
    message: 'Voucher đã được sử dụng thành công',
  });
});

export const redeemRewardVoucherHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  appAssert(userId, BAD_REQUEST, 'Vui lòng đăng nhập để đổi điểm');

  const voucher = await redeemRewardVoucher(id, userId);

  return res.success(OK, {
    data: voucher,
    message: 'Đổi điểm nhận voucher thành công!',
  });
});
