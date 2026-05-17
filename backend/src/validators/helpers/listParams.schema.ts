import z from 'zod';
import ListParams from '@/types/dto/listParams.dto';

export const listParamsSchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      const num = Number(val);
      return Number.isFinite(num) && num > 0 ? num : 1;
    }),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      const num = Number(val);
      return Number.isFinite(num) && num > 0 && num <= 100 ? num : 10;
    }),

  search: z.string().optional(),
}) satisfies z.ZodType<ListParams>;
