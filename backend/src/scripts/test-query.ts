import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductModel from '../models/product.model';

dotenv.config();

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const queryText = 'cay';
  const dbQuery = {
    isAvailable: true,
    $or: [
      { name: { $regex: queryText.trim(), $options: 'i' } },
      { description: { $regex: queryText.trim(), $options: 'i' } },
      { tags: { $regex: queryText.trim(), $options: 'i' } }
    ]
  };

  const products = await ProductModel.find().lean();
  console.log(`Found ${products.length} products in database:`);
  products.forEach(p => {
    console.log(`- ${p.name} (Category: "${p.category}", Tags: ${p.tags.join(', ')}, isAvailable: ${p.isAvailable})`);
  });

  await mongoose.disconnect();
};

run();
