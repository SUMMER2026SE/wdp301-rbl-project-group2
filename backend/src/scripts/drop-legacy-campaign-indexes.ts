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

  try {
    console.log('Dropping index campaignId_1_productId_1 on campaign_products collection...');
    await db.collection('campaign_products').dropIndex('campaignId_1_productId_1');
    console.log('Successfully dropped legacy index!');
  } catch (error: any) {
    console.error('Failed to drop index:', error.message);
  }

  // Print remaining indexes to verify
  const remainingIndexes = await db.collection('campaign_products').indexes();
  console.log('\nRemaining indexes on campaign_products collection:');
  console.log(JSON.stringify(remainingIndexes, null, 2));

  await mongoose.disconnect();
};

run().catch(console.error);
