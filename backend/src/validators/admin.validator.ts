import { INTERNATIONAL_PHONE_REGEX, VIETNAM_PHONE_REGEX } from '@/constants/regex';
import mongoose from 'mongoose';
import z from 'zod';

export const createManagerValidator = z.object({
  name: z.string().trim().min(1, 'Họ tên không được để trống'),

  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),

  phone: z
    .string()
    .trim()
    .min(10, 'Số điện thoại không được để trống')
    .refine((v) => VIETNAM_PHONE_REGEX.test(v) || INTERNATIONAL_PHONE_REGEX.test(v), {
      message: 'Số điện thoại không hợp lệ',
    }),

  storeId: z
    .string()
    .min(1, 'Vui lòng chọn cửa hàng')
    .refine((v) => mongoose.Types.ObjectId.isValid(v), {
      message: 'Cửa hàng không hợp lệ',
    }),
});
