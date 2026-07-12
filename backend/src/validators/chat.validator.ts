import { z } from 'zod';

export const chatHistoryMessageValidator = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().trim().min(1).max(2000),
});

export const chatRequestValidator = z.object({
  message: z.string().trim().min(1, 'Vui lòng nhập tin nhắn.').max(1000, 'Tin nhắn không được vượt quá 1000 ký tự.'),
  history: z.array(chatHistoryMessageValidator).max(20, 'Lịch sử chat quá dài.').optional().default([]),
});

export type ChatRequestInput = z.infer<typeof chatRequestValidator>;
