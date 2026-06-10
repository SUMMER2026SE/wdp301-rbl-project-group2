import { EMAIL_REGEX, VIETNAM_PHONE_REGEX, INTERNATIONAL_PHONE_REGEX } from '@/constants/regex';
import z from 'zod';

export const emailValidator = z.string().min(1).max(255).regex(EMAIL_REGEX, 'Invalid email format');
const passwordValidator = z
  .string()
  .trim()
  .regex(/^\S+$/, 'Password must not contain spaces')
  .min(6, 'Password must be at least 6 characters')
  .max(255, 'Password must be at most 255 characters');

export const strongPasswordValidator = z
  .string()
  .trim()
  .regex(/^\S+$/, 'Mật khẩu không được chứa khoảng trắng')
  .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
  .max(255, 'Mật khẩu tối đa 255 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ viết hoa')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
  .regex(/[^a-zA-Z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt');
const usernameValidator = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .regex(
    /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/,
    'Username can only contain letters, numbers and spaces'
  );

export const loginValidator = z.object({
  email: emailValidator,
  password: passwordValidator,
  userAgent: z.string().optional(),
  deviceId: z.string().optional(),
});

export type TLoginParams = z.infer<typeof loginValidator>;

export const registerValidator = z.preprocess(
  (val: any) => {
    if (val && typeof val === 'object') {
      if (val.confirm_password !== undefined && val.confirmPassword === undefined) {
        val.confirmPassword = val.confirm_password;
      }
    }
    return val;
  },
  loginValidator
    .extend({
      username: usernameValidator,
      password: strongPasswordValidator,
      confirmPassword: strongPasswordValidator,
    })
).refine((data: any) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp nhau',
  path: ['confirmPassword'],
});

export type TRegisterParams = z.infer<typeof registerValidator>;

export const verificationCodeValidator = z.string().length(6, 'Mã xác thực phải có 6 chữ số');

export const verifyEmailValidator = z.object({
  email: emailValidator,
  code: verificationCodeValidator,
});

export type TVerifyEmailParams = z.infer<typeof verifyEmailValidator>;

export const resetPasswordValidator = z.preprocess(
  (val: any) => {
    if (val && typeof val === 'object') {
      if (val.confirm_password !== undefined && val.confirmPassword === undefined) {
        val.confirmPassword = val.confirm_password;
      }
    }
    return val;
  },
  z.object({
    email: emailValidator,
    code: z.string().length(6, 'Mã xác thực phải có 6 chữ số'),
    password: strongPasswordValidator,
    confirmPassword: strongPasswordValidator,
  })
).refine((data: any) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp nhau',
  path: ['confirmPassword'],
});

export type TResetPasswordParams = z.infer<typeof resetPasswordValidator>;

const phone = z.string().trim().refine(
  (v) => VIETNAM_PHONE_REGEX.test(v) || INTERNATIONAL_PHONE_REGEX.test(v),
  'Số điện thoại không hợp lệ'
);

const emptyStringToUndefined = (val: unknown) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};

const optionalPhone = z.preprocess(emptyStringToUndefined, phone.optional());

const optionalDistrict = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

export const updateMeValidator = z.object({
  username: usernameValidator.optional(),
  fullName: z.string().trim().min(1, 'Họ và tên không được để trống').optional(),
  phone: optionalPhone,
  addresses: z.array(z.object({
    label: z.string().trim().min(1),
    receiverName: z.string().trim().min(1),
    phone: optionalPhone,
    detail: z.string().trim().min(1),
    ward: z.string().trim().min(1),
    district: optionalDistrict,
    city: z.string().trim().min(1),
    isDefault: z.boolean().optional(),
  })).max(10).optional(),

  preferences: z.object({
    dietary: z.array(z.string().trim()).optional(),
    allergies: z.array(z.string().trim()).optional(),
    healthGoals: z.array(z.string().trim()).optional(),
  }).optional(),
  receiveCampaignNotifications: z.boolean().optional(),
}).strict();

export type TUpdateMeParams = z.infer<typeof updateMeValidator>;