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

  // Find admin user
  const admin = await UserModel.findOne({ role: 'admin' }).lean();
  if (!admin) throw new Error('No admin user found.');

  // Find another 3 available products (skip first 3 if possible to get different ones)
  const products = await ProductModel.find({ isAvailable: true }).skip(3).limit(3).lean();
  const fallbackProducts = products.length > 0 ? products : await ProductModel.find({ isAvailable: true }).limit(3).lean();

  if (fallbackProducts.length === 0) throw new Error('No available products found.');

  const now = new Date();
  const endTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days

  // Delete existing if any to recreate
  await CampaignModel.deleteOne({ name: 'Ưu đãi Cuối Tuần' });

  const campaign = await CampaignModel.create({
    name: 'Ưu đãi Cuối Tuần',
    type: 'discount',
    status: CampaignStatus.APPROVED,
    createdBy: admin._id,
    products: fallbackProducts.map((p) => ({
      productId: p._id,
      discount: 15,
      fixedPrice: null as number | null,
    })),
    startTime: now,
    endTime,
    views: 120,
    clicks: 35,
  });

  console.log(`Created campaign: ${campaign.name} (${campaign._id})`);
  console.log(`  Products: ${fallbackProducts.map((p) => p.name).join(', ')}`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
