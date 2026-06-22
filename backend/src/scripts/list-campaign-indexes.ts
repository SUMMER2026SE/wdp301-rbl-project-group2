import 'dotenv/config';
import mongoose from 'mongoose';

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const campaignsIndexes = await db.collection('campaigns').indexes();
  console.log('--- Indexes on campaigns collection ---');
  console.log(JSON.stringify(campaignsIndexes, null, 2));

  const campaignProductsIndexes = await db.collection('campaign_products').indexes();
  console.log('\n--- Indexes on campaign_products collection ---');
  console.log(JSON.stringify(campaignProductsIndexes, null, 2));

  await mongoose.disconnect();
};

run().catch(console.error);
