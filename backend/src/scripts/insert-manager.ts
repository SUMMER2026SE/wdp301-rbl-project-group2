import dns from 'dns';
// Force Google DNS to bypass local Windows DNS resolution issues with MongoDB Atlas SRV records
dns.setServers(['8.8.8.8']);

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '@/models/user.model';
import { StoreModel } from '@/models/store.model';
import { Role, UserStatus } from '@/types/user.type';

dotenv.config();

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Use the existing FoodieDash Hải Châu (Trụ sở) ID
  const storeId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2a3c8b4567');
  let store = await StoreModel.findById(storeId);

  if (!store) {
    console.log('Store 60c72b2f9b1d8b2a3c8b4567 not found, finding any store...');
    store = await StoreModel.findOne();
  }

  if (!store) {
    throw new Error('No stores exist in the database. Please seed stores first.');
  }

  console.log(`Using store: ${store.name} (${store._id})`);

  // Insert or update the manager user
  const email = 'manager@foodiedash.vn';
  const username = 'manager1';
  const phone = '0987654321';
  const password = 'Manager@123';

  // Check if exists
  let manager = await UserModel.findOne({ $or: [{ email }, { username }] });
  if (manager) {
    console.log('Manager user already exists, updating properties...');
    manager.role = Role.MANAGER;
    manager.storeId = store._id;
    manager.status = UserStatus.ACTIVE;
    manager.phone = phone;
    manager.passwordHash = password; // pre-save will re-hash it automatically
    manager.verifiedAt = new Date();
    await manager.save();
    console.log('Manager user updated successfully!');
  } else {
    console.log('Manager user does not exist, creating new manager...');
    manager = await UserModel.create({
      username,
      fullName: 'Quản Lý Hải Châu',
      email,
      phone,
      passwordHash: password, // pre-save will hash it automatically
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      storeId: store._id,
      verifiedAt: new Date(),
    });
    console.log('Manager user created successfully!');
  }

  console.log('\n--- MANAGER ACCOUNT DETAILS ---');
  console.log(`Store Name : ${store.name}`);
  console.log(`Store ID   : ${store._id}`);
  console.log(`Username   : ${username}`);
  console.log(`Email      : ${email}`);
  console.log(`Password   : ${password}`);
  console.log('-------------------------------\n');

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Failed to insert/update manager:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
