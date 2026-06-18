import { z } from 'zod';
import { REVIEW_FEEDBACK_TAG_VALUES } from '@/types/review.type';
import { REVIEW_REACTION_VALUES } from '@/types/review-reaction.type';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ObjectId khong hop le');

export const createReviewItemValidator = z.object({
  productId: objectIdSchema,
  rating: z.coerce.number().int().min(1, 'Diem danh gia phai tu 1 den 5').max(5, 'Diem danh gia phai tu 1 den 5'),
  feedbackTags: z.array(z.enum(REVIEW_FEEDBACK_TAG_VALUES)).max(5, 'Chi duoc chon toi da 5 van de').optional().default([]),
  comment: z.string().trim().max(1000, 'Nhan xet khong duoc vuot qua 1000 ky tu').optional().default(''),
  images: z.array(objectIdSchema).max(4, 'Chi duoc tai toi da 4 anh cho moi danh gia').optional().default([]),
  isAnonymous: z.boolean().optional().default(false),
});

export const createOrderReviewsValidator = z.object({
  orderId: objectIdSchema,
  reviews: z.array(createReviewItemValidator).min(1, 'Can co it nhat mot danh gia').max(20, 'Qua nhieu danh gia trong mot lan gui'),
});

export const reviewListQueryValidator = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const featuredReviewQueryValidator = z.object({
  limit: z.coerce.number().int().min(1).max(6).default(3),
});

export const reviewReactionValidator = z.object({
  reaction: z.enum(REVIEW_REACTION_VALUES).nullable(),
});

export type TCreateReviewItem = z.infer<typeof createReviewItemValidator>;
