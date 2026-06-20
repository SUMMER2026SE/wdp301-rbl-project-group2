import z from 'zod';

const campaignProductItemValidator = z.object({
  productId: z.string().length(24, 'ID sản phẩm không hợp lệ'),
  fixedPrice: z.number().min(0).nullable().optional(),
  discount: z.number().min(0).max(100).nullable().optional(),
});

export const createCampaignValidator = z.object({
  name: z.string().trim().min(1, 'Tên chiến dịch không được để trống'),
  type: z.string().trim().min(1, 'Loại chiến dịch không được để trống'),
  products: z.array(campaignProductItemValidator).default([]),
  startTime: z.string().datetime({ message: 'Thời gian bắt đầu không hợp lệ' }),
  endTime: z.string().datetime({ message: 'Thời gian kết thúc không hợp lệ' }),
  budget: z.number().min(0, 'Ngân sách không được nhỏ hơn 0').default(0).optional(),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
  path: ['endTime'],
});

export const updateCampaignValidator = z.object({
  name: z.string().trim().min(1, 'Tên chiến dịch không được để trống').optional(),
  type: z.string().trim().min(1, 'Loại chiến dịch không được để trống').optional(),
  products: z.array(campaignProductItemValidator).optional(),
  startTime: z.string().datetime({ message: 'Thời gian bắt đầu không hợp lệ' }).optional(),
  endTime: z.string().datetime({ message: 'Thời gian kết thúc không hợp lệ' }).optional(),
  budget: z.number().min(0, 'Ngân sách không được nhỏ hơn 0').optional(),
}).refine(data => {
  if (data.startTime && data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
  path: ['endTime'],
});

export const updateCampaignStatusValidator = z.object({
  status: z.enum(['approved', 'rejected'], {
    message: 'Trạng thái không hợp lệ',
  }),
});

export type TCreateCampaignParams = z.infer<typeof createCampaignValidator>;
export type TUpdateCampaignParams = z.infer<typeof updateCampaignValidator>;
export type TUpdateCampaignStatusParams = z.infer<typeof updateCampaignStatusValidator>;
