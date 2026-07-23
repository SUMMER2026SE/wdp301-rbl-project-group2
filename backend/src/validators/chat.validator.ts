import { z } from 'zod';

export const chatHistoryMessageValidator = z.object({
  role: z.literal('user'),
  content: z.string().trim().min(1).max(2000),
});

export const chatRequestValidator = z.object({
  message: z.string().trim().min(1, 'Vui lòng nhập tin nhắn.').max(1000, 'Tin nhắn không được vượt quá 1000 ký tự.'),
  clientMessageId: z.string().trim().min(1).max(100).optional(),
  conversationId: z.string().trim().max(100).optional(),
  storeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'storeId không hợp lệ.').optional(),
  fulfillmentType: z.enum(['delivery', 'pickup', 'dine_in']).optional(),
  locale: z.string().trim().max(20).default('vi-VN'),
  timezone: z.string().trim().max(64).default('Asia/Ho_Chi_Minh'),
  history: z.array(chatHistoryMessageValidator).max(20, 'Lịch sử chat quá dài.').optional().default([]),
});

export type ChatRequestInput = z.infer<typeof chatRequestValidator>;
