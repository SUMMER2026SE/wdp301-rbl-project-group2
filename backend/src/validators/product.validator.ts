import { z } from 'zod';

const variantOptionValidator = z.object({
  choice: z.string().min(1, 'Option choice is required').trim(),
  extra_price: z.coerce.number().min(0).default(0),
});

const variantGroupValidator = z.object({
  name: z.string().min(1, 'Variant group name is required').trim(),
  required: z.boolean().optional().default(false),
  multiple: z.boolean().optional().default(false),
  max_choices: z.coerce.number().int().min(1).optional(),
  options: z.array(variantOptionValidator).min(1, 'Variant group must have at least 1 option'),
});

export const productValidator = z.object({
  name: z.string().min(1, 'Dish name is required').trim(),
  description: z.string().min(1, 'Description is required').trim(),
  image: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  category: z.string().min(1, 'Category is required').trim(),
  restaurant: z.string().min(1, 'Restaurant name is required').trim(),
  time: z.string().min(1, 'Preparation time is required').trim(),
  recipe: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.string(),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional().default([]),
  health_warning: z.string().optional(),
  health_tags: z.array(z.string()).optional().default([]),
  isAvailable: z.boolean().optional().default(true),

  variants: z.array(variantGroupValidator).optional().default([]),
});

export const updateProductValidator = productValidator.partial();