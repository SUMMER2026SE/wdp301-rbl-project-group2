import dns from 'dns';
// Force Google DNS to bypass local Windows DNS resolution issues with MongoDB Atlas SRV records
dns.setServers(['8.8.8.8']);

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { StoreModel } from '@/models/store.model';

dotenv.config();

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  const stores = await StoreModel.find();
  console.log('--- STORES IN DB ---');
  stores.forEach((store) => {
    console.log(`- ID: ${store._id}, Name: "${store.name}", Address: "${store.address}"`);
  });
  console.log('--------------------');
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
});
