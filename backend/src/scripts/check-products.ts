import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '@/models/user.model';
import ProductModel from '@/models/product.model';

dotenv.config();

async function checkUsers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    return;
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  const staff = await UserModel.find({ role: 'staff' });
  console.log(`\n--- Staff Users (${staff.length}) ---`);
  for (const s of staff) {
    console.log(`Name: ${s.fullName || s.username}, ID: ${s._id}, StoreId: ${s.storeId}`);
  }

  const managers = await UserModel.find({ role: 'manager' });
  console.log(`\n--- Manager Users (${managers.length}) ---`);
  for (const m of managers) {
    console.log(`Name: ${m.fullName || m.username}, ID: ${m._id}, StoreId: ${m.storeId}`);
  }

  const products = await ProductModel.find({ storeId: '60c72b2f9b1d8b2a3c8b4567' });
  console.log(`\n--- Products in default store: ${products.length} ---`);

  await mongoose.disconnect();
}

checkUsers().catch(console.error);
