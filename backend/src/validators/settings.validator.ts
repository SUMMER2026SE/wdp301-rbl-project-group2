import z from 'zod';
import { EMAIL_REGEX } from '@/constants/regex';

const storeHourValidator = z.object({
  id: z.string(),
  label: z.string(),
  open: z.boolean(),
  start: z.string(),
  end: z.string(),
});

export const updateSettingsValidator = z.object({
  storeName: z.string().trim().min(1, 'Tên cửa hàng không được để trống'),
  supportEmail: z.string().trim().regex(EMAIL_REGEX, 'Email không hợp lệ'),
  address: z.string().trim().min(5, 'Địa chỉ không hợp lệ'),
  
  aiRecommendations: z.boolean(),
  autoAssignDrivers: z.boolean(),
  acceptCod: z.boolean(),
  systemNotifications: z.boolean(),
  
  baseDeliveryFee: z.string(),
  feePerKm: z.string(),
  freeDeliveryEnabled: z.boolean(),
  freeDeliveryThreshold: z.string(),
  maxDistance: z.number().min(1),
  
  hours: z.array(storeHourValidator),
});

export type TUpdateSettingsParams = z.infer<typeof updateSettingsValidator>;
