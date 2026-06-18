import z from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(1, 'Tên cửa hàng không được để trống').max(100),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()).length(2),
  }),
  address: z.string().min(1, 'Địa chỉ không được để trống'),
  district: z.string().min(1, 'Quận/Huyện không được để trống'),
});

export const updateStoreSchema = createStoreSchema.partial();
