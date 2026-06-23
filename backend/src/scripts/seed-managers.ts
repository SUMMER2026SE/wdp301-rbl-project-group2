import dns from 'dns';
// Force Google DNS to bypass local Windows DNS resolution issues with MongoDB Atlas SRV records
dns.setServers(['8.8.8.8']);

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '@/models/user.model';
import { StoreModel } from '@/models/store.model';
import { Role, UserStatus } from '@/types/user.type';

dotenv.config();

interface ManagerSeed {
  storeId: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const MANAGER_SEEDS: ManagerSeed[] = [
  {
    storeId: '60c72b2f9b1d8b2a3c8b4567',
    username: 'manager1',
    fullName: 'Quản Lý Hải Châu',
    email: 'manager@foodiedash.vn',
    phone: '0987654321',
    password: 'Manager@123',
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b4568',
    username: 'manager_tk',
    fullName: 'Quản Lý Thanh Khê',
    email: 'manager.tk@foodiedash.vn',
    phone: '0987654322',
    password: 'Manager@123',
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b4569',
    username: 'manager_st',
    fullName: 'Quản Lý Sơn Trà',
    email: 'manager.st@foodiedash.vn',
    phone: '0987654323',
    password: 'Manager@123',
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456a',
    username: 'manager_nhs',
    fullName: 'Quản Lý Ngũ Hành Sơn',
    email: 'manager.nhs@foodiedash.vn',
    phone: '0987654324',
    password: 'Manager@123',
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456b',
    username: 'manager_cl',
    fullName: 'Quản Lý Cẩm Lệ',
    email: 'manager.cl@foodiedash.vn',
    phone: '0987654325',
    password: 'Manager@123',
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456c',
    username: 'manager_lc',
    fullName: 'Quản Lý Liên Chiểu',
    email: 'manager.lc@foodiedash.vn',
    phone: '0987654326',
    password: 'Manager@123',
  },
];

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  let created = 0;
  let skipped = 0;

  for (const seed of MANAGER_SEEDS) {
    const store = await StoreModel.findById(seed.storeId);
    if (!store) {
      console.log(`[SKIP] Store ${seed.storeId} not found.`);
      continue;
    }

    // Check if a manager already exists for this store
    const existingManager = await UserModel.findOne({ storeId: seed.storeId, role: Role.MANAGER });
    if (existingManager) {
      console.log(`[SKIP] ${store.name} — already has manager: ${existingManager.username} (${existingManager.email})`);
      skipped++;
      continue;
    }

    // Also check for duplicate username/email across all users
    const duplicate = await UserModel.findOne({
      $or: [{ email: seed.email }, { username: seed.username }],
    });
    if (duplicate) {
      console.log(
        `[SKIP] ${store.name} — username/email conflict: ${duplicate.username} / ${duplicate.email} already used by role=${duplicate.role}`
      );
      skipped++;
      continue;
    }

    // Create manager
    const manager = await UserModel.create({
      username: seed.username,
      fullName: seed.fullName,
      email: seed.email,
      phone: seed.phone,
      passwordHash: seed.password, // pre-save hook will hash it
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      storeId: store._id,
      verifiedAt: new Date(),
    });

    console.log(`[CREATED] ${store.name} — ${manager.username} / ${manager.email} / ${seed.password}`);
    created++;
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total stores processed: ${MANAGER_SEEDS.length}`);
  console.log(`----------------\n`);

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Failed to seed managers:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
