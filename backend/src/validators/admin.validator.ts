import { INTERNATIONAL_PHONE_REGEX, VIETNAM_PHONE_REGEX } from '@/constants/regex';
import z from 'zod';

export const createStaffValidator = z.object({
  name: z.string().min(1, 'Họ tên không được để trống'),
  email: z.string().email('email không hợp lệ'),
  phone: z
    .string()
    .refine((v) => VIETNAM_PHONE_REGEX.test(v) || INTERNATIONAL_PHONE_REGEX.test(v), {
      message: 'Số điện thoại không hợp lệ',
    })
    .optional(),
});