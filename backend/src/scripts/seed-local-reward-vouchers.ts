import dotenv from 'dotenv';
import mongoose from 'mongoose';
import VoucherModel from '@/models/voucher.model';
import { DiscountType, VoucherCategory } from '@/types/voucher.type';
import { UserTier } from '@/types/user.type';

dotenv.config();

type RewardVoucherSeed = {
  code: string;
  title: string;
  description: string;
  category: VoucherCategory;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  pointCost: number;
  minTier: UserTier;
};

const REWARD_VOUCHERS: RewardVoucherSeed[] = [
  { code: 'REWARD-BRONZE-SHIP', title: 'Freeship 15K hạng Đồng', description: 'Giảm phí giao hàng tối đa 15.000đ cho đơn từ 99.000đ.', category: VoucherCategory.FREESHIP, discountType: DiscountType.FIXED_AMOUNT, discountValue: 15000, maxDiscount: 15000, minOrderValue: 99000, pointCost: 150, minTier: UserTier.BRONZE },
  { code: 'REWARD-BRONZE-10', title: 'Giảm 10% hạng Đồng', description: 'Giảm 10%, tối đa 20.000đ cho đơn từ 149.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.PERCENTAGE, discountValue: 10, maxDiscount: 20000, minOrderValue: 149000, pointCost: 250, minTier: UserTier.BRONZE },
  { code: 'REWARD-SILVER-20K', title: 'Giảm 20K hạng Bạc', description: 'Giảm 20.000đ cho đơn từ 149.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.FIXED_AMOUNT, discountValue: 20000, maxDiscount: 20000, minOrderValue: 149000, pointCost: 350, minTier: UserTier.SILVER },
  { code: 'REWARD-SILVER-SHIP', title: 'Freeship 25K hạng Bạc', description: 'Giảm phí giao hàng tối đa 25.000đ cho đơn từ 149.000đ.', category: VoucherCategory.FREESHIP, discountType: DiscountType.FIXED_AMOUNT, discountValue: 25000, maxDiscount: 25000, minOrderValue: 149000, pointCost: 400, minTier: UserTier.SILVER },
  { code: 'REWARD-GOLD-15', title: 'Giảm 15% hạng Vàng', description: 'Giảm 15%, tối đa 50.000đ cho đơn từ 199.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.PERCENTAGE, discountValue: 15, maxDiscount: 50000, minOrderValue: 199000, pointCost: 700, minTier: UserTier.GOLD },
  { code: 'REWARD-GOLD-40K', title: 'Giảm 40K hạng Vàng', description: 'Giảm 40.000đ cho đơn từ 249.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.FIXED_AMOUNT, discountValue: 40000, maxDiscount: 40000, minOrderValue: 249000, pointCost: 800, minTier: UserTier.GOLD },
  { code: 'REWARD-PLATINUM-20', title: 'Giảm 20% hạng Bạch kim', description: 'Giảm 20%, tối đa 80.000đ cho đơn từ 299.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.PERCENTAGE, discountValue: 20, maxDiscount: 80000, minOrderValue: 299000, pointCost: 1200, minTier: UserTier.PLATINUM },
  { code: 'REWARD-PLATINUM-60K', title: 'Giảm 60K hạng Bạch kim', description: 'Giảm 60.000đ cho đơn từ 349.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.FIXED_AMOUNT, discountValue: 60000, maxDiscount: 60000, minOrderValue: 349000, pointCost: 1400, minTier: UserTier.PLATINUM },
  { code: 'REWARD-DIAMOND-25', title: 'Giảm 25% hạng Kim cương', description: 'Giảm 25%, tối đa 120.000đ cho đơn từ 399.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.PERCENTAGE, discountValue: 25, maxDiscount: 120000, minOrderValue: 399000, pointCost: 2000, minTier: UserTier.DIAMOND },
  { code: 'REWARD-DIAMOND-100K', title: 'Giảm 100K hạng Kim cương', description: 'Giảm 100.000đ cho đơn từ 499.000đ.', category: VoucherCategory.DISCOUNT, discountType: DiscountType.FIXED_AMOUNT, discountValue: 100000, maxDiscount: 100000, minOrderValue: 499000, pointCost: 2300, minTier: UserTier.DIAMOND },
];

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  const host = new URL(mongoUri.replace(/^mongodb:/, 'http:')).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Refusing to seed a non-local MongoDB instance.');
  }

  await mongoose.connect(mongoUri);

  const startAt = new Date();
  const endAt = new Date(startAt);
  endAt.setDate(endAt.getDate() + 30);

  for (const seed of REWARD_VOUCHERS) {
    await VoucherModel.findOneAndUpdate(
      { code: seed.code },
      {
        $set: {
          ...seed,
          isActive: true,
          isReward: true,
          isPersonal: false,
          startAt,
          endAt,
        },
        $setOnInsert: { usedCount: 0 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${REWARD_VOUCHERS.length} local reward vouchers, valid until ${endAt.toISOString().slice(0, 10)}.`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Failed to seed local reward vouchers:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});