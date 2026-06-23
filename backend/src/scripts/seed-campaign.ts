import 'dotenv/config';
import mongoose from 'mongoose';
import UserModel from '@/models/user.model';
import ProductModel from '@/models/product.model';
import { CampaignModel } from '@/models/campaign.model';
import { CampaignStatus } from '@/types/campaign.type';

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Idempotent: skip if campaign already exists
  const existing = await CampaignModel.findOne({ name: 'Khuyến mãi Khai Trương' });
  if (existing) {
    console.log('Campaign "Khuyến mãi Khai Trương" already exists — skipping.');
    await mongoose.disconnect();
    return;
  }

  // Find admin user
  const admin = await UserModel.findOne({ role: 'admin' }).lean();
  if (!admin) throw new Error('No admin user found. Please seed an admin first.');

  // Find 3 available products
  const products = await ProductModel.find({ isAvailable: true }).limit(3).lean();
  if (products.length === 0) throw new Error('No available products found.');

  const now = new Date();
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  const campaign = await CampaignModel.create({
    name: 'Khuyến mãi Khai Trương',
    type: 'discount',
    status: CampaignStatus.APPROVED,
    createdBy: admin._id,
    products: products.map((p) => ({
      productId: p._id,
      discount: 20,
      fixedPrice: null as number | null,
    })),
    startTime: now,
    endTime,
  });

  console.log(`Created campaign: ${campaign.name} (${campaign._id})`);
  console.log(`  Products: ${products.map((p) => p.name).join(', ')}`);
  console.log(`  Valid until: ${endTime.toLocaleDateString('vi-VN')}`);

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
