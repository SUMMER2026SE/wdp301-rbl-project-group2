import { z } from 'zod';
import {
  PRODUCT_BEHAVIOR_EVENT_SOURCES,
  PRODUCT_BEHAVIOR_EVENT_TYPES,
} from '@/models/product-behavior-event.model';

const variantOptionValidator = z.object({
  choice: z.string().min(1, 'Option choice is required').trim(),
  extraPrice: z.coerce.number().min(0).default(0),
});

const variantGroupValidator = z.object({
  name: z.string().min(1, 'Variant group name is required').trim(),
  required: z.boolean().optional().default(false),
  multiple: z.boolean().optional().default(false),
  maxChoices: z.coerce.number().int().min(1).optional(),
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
        ingredientId: z.string().length(24, 'Ingredient id is invalid').optional(),
        ingredientName: z.string().min(1, 'Ingredient name is required').trim().optional(),
        quantity: z.coerce.number().positive('Quantity must be greater than 0'),
        unit: z.string().min(1, 'Unit is required').trim(),
      }).refine((item) => item.ingredientId || item.ingredientName, {
        message: 'Ingredient id or ingredient name is required',
      })
    )
    .optional(),
  tags: z.array(z.string()).optional().default([]),
  healthWarning: z.string().optional(),
  healthTags: z.array(z.string()).optional().default([]),
  isAvailable: z.boolean().optional().default(true),

  variants: z.array(variantGroupValidator).optional().default([]),
});

export const updateProductValidator = productValidator.partial();

export const productBehaviorEventValidator = z.object({
  eventType: z.enum(PRODUCT_BEHAVIOR_EVENT_TYPES),
  source: z.enum(PRODUCT_BEHAVIOR_EVENT_SOURCES).optional().default('unknown'),
  storeId: z.string().length(24, 'storeId không hợp lệ').optional().nullable(),
});
