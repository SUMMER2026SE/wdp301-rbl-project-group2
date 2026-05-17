import { PaymentMethod } from '@/types/order.type';
import z from 'zod';

// ---- Shared sub-validators ----

export const voucherIdValidator = z.string().length(24, 'Voucher id không hợp lệ').optional();

export const deliveryAddressValidator = z.object({
  label: z.string().optional(),
  receiver_name: z.string().min(1, 'Tên người nhận không được để trống'),
  phone: z.string().min(1, 'Số điện thoại không được để trống'),
  detail: z.string().min(1, 'Địa chỉ chi tiết không được để trống'),
  district: z.string().min(1, 'Quận/Huyện không được để trống'),
  city: z.string().min(1, 'Thành phố không được để trống'),
});

export const orderItemVariationValidator = z.object({
  name: z.string().min(1),
  choice: z.string().min(1),
});

export const orderItemValidator = z.object({
  product_id: z.string().length(24, 'Product id không hợp lệ'),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0'),
  variations: z.array(orderItemVariationValidator).default([]),
});

// ---- Main validator ----

export const placeOrderValidator = z.object({
  /**
   * Voucher is OPTIONAL — orders without discount are valid.
   */
  voucher: voucherIdValidator,

  /**
   * Payment method — defaults to COD.
   */
  payment_method: z.enum(Object.values(PaymentMethod) as [string, ...string[]]).default(PaymentMethod.CASH_ON_DELIVERY),

  /**
   * At least 1 item required.
   */
  items: z.array(orderItemValidator).min(1, 'Phải có ít nhất một sản phẩm'),

  shipping_fee: z.number().min(0, 'Phí giao hàng không hợp lệ').default(0),
  /**
   * Optional override address.
   * If omitted, the service will use the user's default address.
   */
  delivery_address: deliveryAddressValidator.optional(),
  note: z.string().trim().max(500).optional(),
  return_url: z.string().trim().url().optional(),
  cancel_url: z.string().trim().url().optional(),
});

// ---- Inferred Types ----

export type TOrderItemVariation = z.infer<typeof orderItemVariationValidator>;
export type TOrderItem = z.infer<typeof orderItemValidator>;
export type TPlaceOrderValidator = z.infer<typeof placeOrderValidator>;
