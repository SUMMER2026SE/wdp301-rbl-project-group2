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
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
  path: ['endTime'],
}).refine(data => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(data.startTime) >= today;
}, {
  message: 'Thời gian bắt đầu phải từ ngày hôm nay trở đi',
  path: ['startTime'],
});

export const updateCampaignValidator = z.object({
  name: z.string().trim().min(1, 'Tên chiến dịch không được để trống').optional(),
  type: z.string().trim().min(1, 'Loại chiến dịch không được để trống').optional(),
  products: z.array(campaignProductItemValidator).optional(),
  startTime: z.string().datetime({ message: 'Thời gian bắt đầu không hợp lệ' }).optional(),
  endTime: z.string().datetime({ message: 'Thời gian kết thúc không hợp lệ' }).optional(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
}).refine(data => {
  if (data.startTime && data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
  path: ['endTime'],
}).refine(data => {
  if (data.startTime) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(data.startTime) >= today;
  }
  return true;
}, {
  message: 'Thời gian bắt đầu phải từ ngày hôm nay trở đi',
  path: ['startTime'],
});

export const suggestCampaignValidator = z.object({
  days: z.number().int().min(3).max(90).optional().default(14),
  weather: z.enum(['rainy', 'hot', 'cold', 'sunny', 'normal']).default('normal'),
  occasion: z.string().default('none'),
  goal: z.enum(['boost_sales', 'clear_stock', 'contextual', 'engagement']).default('boost_sales'),
  productCount: z.number().int().min(2).max(6).optional().default(3),
});

export const updateCampaignStatusValidator = z.object({
  status: z.enum(['approved', 'rejected'], {
    message: 'Trạng thái không hợp lệ',
  }),
});

export type TCreateCampaignParams = z.infer<typeof createCampaignValidator>;
export type TUpdateCampaignParams = z.infer<typeof updateCampaignValidator>;
export type TUpdateCampaignStatusParams = z.infer<typeof updateCampaignStatusValidator>;

export const aiCampaignSuggestRequestValidator = z.object({
  weather: z.enum(['rainy', 'hot', 'cold', 'sunny', 'normal']).default('normal'),
  occasion: z.string().default('none'),
  goal: z.enum(['boost_sales', 'clear_stock', 'engagement']).default('boost_sales'),
  productCount: z.number().int().min(2).max(6).optional().default(3),
});

export type TAICampaignSuggestParams = z.infer<typeof aiCampaignSuggestRequestValidator>;

