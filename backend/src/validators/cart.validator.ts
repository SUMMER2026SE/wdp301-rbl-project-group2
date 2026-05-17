import { z } from 'zod';

export const cartVariationValidator = z.object({
  name: z.string(),
  choice: z.string(),
});

export const addToCartValidator = z.object({
  product_id: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  
  variations: z.array(cartVariationValidator).optional().default([]),
});

export type AddToCartInput = z.infer<typeof addToCartValidator>;