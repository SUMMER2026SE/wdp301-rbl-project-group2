import 'dotenv/config';
import mongoose from 'mongoose';
import { CampaignModel } from '@/models/campaign.model';
import ProductModel from '@/models/product.model';

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const campaigns = await CampaignModel.find().lean();
  console.log(`Found ${campaigns.length} campaigns:`);
  console.log(JSON.stringify(campaigns, null, 2));

  for (const c of campaigns) {
    console.log(`Campaign "${c.name}" (${c.status}) products:`);
    for (const p of c.products) {
      const prod = await ProductModel.findById(p.productId).lean();
      console.log(`  - Product ID: ${p.productId}, Name: ${prod?.name}, Price: ${prod?.price}, Discount: ${p.discount}, FixedPrice: ${p.fixedPrice}`);
    }
  }

  await mongoose.disconnect();
};

run().catch(console.error);
