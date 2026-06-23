import 'dotenv/config';
import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { StoreModel } from '@/models/store.model';

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const stores = await StoreModel.find().lean();
  console.log('Stores:');
  console.log(stores.map(s => `${s.name} (${s._id})`));

  const count = await ProductModel.countDocuments();
  console.log(`Total products in database: ${count}`);

  const sampleProducts = await ProductModel.find({ name: 'Cao Lầu Hội An Đặc Biệt' }).lean();
  console.log('Cao Lầu copies:');
  console.log(sampleProducts.map(p => `ID: ${p._id}, StoreId: ${(p as any).storeId}, Price: ${p.price}`));

  await mongoose.disconnect();
};

run().catch(console.error);
