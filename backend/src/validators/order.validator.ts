import { PaymentMethod } from '@/types/order.type';
import z from 'zod';

export const voucherIdValidator = z.string().length(24, 'Voucher id không hợp lệ').optional();

export const deliveryAddressValidator = z.object({
  label: z.string().optional(),
  receiverName: z.string().min(1, 'Tên người nhận không được để trống'),
  phone: z.string().min(1, 'Số điện thoại không được để trống'),
  detail: z.string().min(1, 'Địa chỉ chi tiết không được để trống'),
  ward: z.string().min(1, 'Phường/Xã không được để trống'),
  district: z.string().min(1, 'Quận/Huyện không được để trống'),
  city: z.string().min(1, 'Thành phố không được để trống'),
});

export const orderItemVariationValidator = z.object({
  name: z.string().min(1),
  choice: z.string().min(1),
});

export const orderItemValidator = z.object({
  productId: z.string().length(24, 'Product id không hợp lệ'),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0'),
  variations: z.array(orderItemVariationValidator).default([]),
});

export const placeOrderValidator = z.object({
  voucher: voucherIdValidator,
  paymentMethod: z.enum(Object.values(PaymentMethod) as [string, ...string[]]).default(PaymentMethod.CASH),
  items: z.array(orderItemValidator).min(1, 'Phải có ít nhất một sản phẩm'),
  shippingFee: z.number().min(0, 'Phí giao hàng không hợp lệ').default(0),
  deliveryAddress: deliveryAddressValidator.optional(),
  note: z.string().trim().max(500).optional(),
  returnUrl: z.string().trim().url().optional(),
  cancelUrl: z.string().trim().url().optional(),
});

export type TOrderItemVariation = z.infer<typeof orderItemVariationValidator>;
export type TOrderItem = z.infer<typeof orderItemValidator>;
export type TPlaceOrderValidator = z.infer<typeof placeOrderValidator>;
