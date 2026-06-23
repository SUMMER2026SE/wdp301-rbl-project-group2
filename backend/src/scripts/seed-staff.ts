import dns from 'dns';
// Force Google DNS to bypass local Windows DNS resolution issues with MongoDB Atlas SRV records.
dns.setServers(['8.8.8.8']);

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '@/models/user.model';
import { StoreModel } from '@/models/store.model';
import { Role, UserStatus } from '@/types/user.type';

dotenv.config();

interface StaffSeed {
  storeId: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const DEFAULT_PASSWORD = 'Staff@123';

const STAFF_SEEDS: StaffSeed[] = [
  {
    storeId: '60c72b2f9b1d8b2a3c8b4567',
    username: 'staff_hc_01',
    fullName: 'Staff Hai Chau 01',
    email: 'staff.hc01@foodiedash.vn',
    phone: '0901000001',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b4567',
    username: 'staff_hc_02',
    fullName: 'Staff Hai Chau 02',
    email: 'staff.hc02@foodiedash.vn',
    phone: '0901000002',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b4568',
    username: 'staff_tk_01',
    fullName: 'Staff Thanh Khe 01',
    email: 'staff.tk01@foodiedash.vn',
    phone: '0901000003',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b4568',
    username: 'staff_tk_02',
    fullName: 'Staff Thanh Khe 02',
    email: 'staff.tk02@foodiedash.vn',
    phone: '0901000004',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b4569',
    username: 'staff_st_01',
    fullName: 'Staff Son Tra 01',
    email: 'staff.st01@foodiedash.vn',
    phone: '0901000005',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b4569',
    username: 'staff_st_02',
    fullName: 'Staff Son Tra 02',
    email: 'staff.st02@foodiedash.vn',
    phone: '0901000006',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456a',
    username: 'staff_nhs_01',
    fullName: 'Staff Ngu Hanh Son 01',
    email: 'staff.nhs01@foodiedash.vn',
    phone: '0901000007',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456a',
    username: 'staff_nhs_02',
    fullName: 'Staff Ngu Hanh Son 02',
    email: 'staff.nhs02@foodiedash.vn',
    phone: '0901000008',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456b',
    username: 'staff_cl_01',
    fullName: 'Staff Cam Le 01',
    email: 'staff.cl01@foodiedash.vn',
    phone: '0901000009',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456b',
    username: 'staff_cl_02',
    fullName: 'Staff Cam Le 02',
    email: 'staff.cl02@foodiedash.vn',
    phone: '0901000010',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456c',
    username: 'staff_lc_01',
    fullName: 'Staff Lien Chieu 01',
    email: 'staff.lc01@foodiedash.vn',
    phone: '0901000011',
    password: DEFAULT_PASSWORD,
  },
  {
    storeId: '60c72b2f9b1d8b2a3c8b456c',
    username: 'staff_lc_02',
    fullName: 'Staff Lien Chieu 02',
    email: 'staff.lc02@foodiedash.vn',
    phone: '0901000012',
    password: DEFAULT_PASSWORD,
  },
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const printExistingStaff = async () => {
  const staff = await UserModel.find({ role: Role.STAFF })
    .select('_id username fullName email phone status storeId createdAt')
    .sort({ storeId: 1, username: 1 })
    .lean();

  console.log(`\n--- EXISTING STAFF IN DB (${staff.length}) ---`);
  if (staff.length === 0) {
    console.log('No staff accounts found.');
    return;
  }

  for (const user of staff) {
    console.log(
      `- ${user.username} | ${user.email} | phone=${user.phone || '-'} | status=${user.status} | storeId=${user.storeId || '-'}`
    );
  }
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  await printExistingStaff();

  let created = 0;
  let skipped = 0;
  let missingStores = 0;

  console.log('\n--- SEED STAFF ---');

  for (const seed of STAFF_SEEDS) {
    const store = await StoreModel.findById(seed.storeId).select('_id name address district isActive').lean();
    if (!store) {
      console.log(`[SKIP] Store ${seed.storeId} not found.`);
      skipped++;
      missingStores++;
      continue;
    }

    const manager = await UserModel.findOne({
      storeId: store._id,
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
    })
      .select('username email')
      .lean();

    if (!manager) {
      console.log(`[WARN] ${store.name} has no active manager; creating staff anyway because store exists.`);
    }

    const email = normalizeEmail(seed.email);
    const duplicate = await UserModel.findOne({
      $or: [{ email }, { username: seed.username }, { phone: seed.phone }],
    })
      .select('username email phone role storeId')
      .lean();

    if (duplicate) {
      const duplicateStoreId = duplicate.storeId ? duplicate.storeId.toString() : '-';
      console.log(
        `[SKIP] ${store.name} - conflict with existing user ${duplicate.username} (${duplicate.email}), role=${duplicate.role}, storeId=${duplicateStoreId}`
      );
      skipped++;
      continue;
    }

    const staff = await UserModel.create({
      username: seed.username,
      fullName: seed.fullName,
      email,
      phone: seed.phone,
      passwordHash: seed.password,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      storeId: store._id,
      verifiedAt: new Date(),
    });

    console.log(`[CREATED] ${store.name} - ${staff.username} / ${staff.email}`);
    created++;
  }

  const totalStaff = await UserModel.countDocuments({ role: Role.STAFF });

  console.log('\n--- SUMMARY ---');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Missing stores: ${missingStores}`);
  console.log(`Total seed rows: ${STAFF_SEEDS.length}`);
  console.log(`Total staff in DB now: ${totalStaff}`);
  console.log('----------------\n');

  await printExistingStaff();
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Failed to seed staff:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
