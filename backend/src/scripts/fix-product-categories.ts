/**
 * Migration: Fix product categories in DB that use Vietnamese values
 * instead of the valid enum values (food | drink | combo | other).
 *
 * Run: pnpm exec ts-node -r tsconfig-paths/register src/scripts/fix-product-categories.ts
 *
 * Why: ProductCategory enum in product.type.ts only allows
 * 'food', 'drink', 'combo', 'other'. Seed data contained
 * Vietnamese category names which cause Mongoose validation
 * errors when saving products (e.g., via updateManagerProductAvailability).
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// ── Mapping: Vietnamese values → valid enum values ─────────────────────
const VI_TO_EN: Record<string, string> = {
  // Discovered in DB on 2026-06-11
  'Giải Khát & Tráng Miệng': 'drink', // Đồ uống & tráng miệng
  'Cơm Đĩa Truyền Thống': 'food', // Cơm đĩa → món ăn
  'Góc Healthy & Ăn Kiêng': 'food', // Món healthy → món ăn
  'Gọi Thêm Ăn Kèm': 'food', // Món ăn kèm → món ăn
  'Trứ Danh Món Nước': 'food', // Món nước (phở, bún, hủ tiếu...) → món ăn
  'Đặc Sản & Bán Chạy': 'food', // Đặc sản & bán chạy → món ăn
  // Legacy aliases (may appear if script re-runs on other DBs)
  'Giải Khát': 'drink',
  'Tráng Miệng': 'food',
};

const VALID_CATEGORIES = new Set(['food', 'drink', 'combo', 'other']);

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI env var is missing');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const col = db.collection('products');

  // Phase 1: Discover all invalid category values ────────────────
  const allCategories = await col.distinct('category');
  const invalid = allCategories.filter((c: string) => !VALID_CATEGORIES.has(c));

  console.log(`\nFound ${invalid.length} invalid category value(s):`);
  for (const cat of invalid) {
    const count = await col.countDocuments({ category: cat });
    console.log(`  "${cat}" → ${count} product(s)`);
  }

  if (invalid.length === 0) {
    console.log('✅ No invalid categories found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Phase 2: Show mapping preview ────────────────────────────────
  console.log('\nProposed mapping:');
  for (const vi of invalid) {
    const en = VI_TO_EN[vi];
    if (en) {
      const valid = VALID_CATEGORIES.has(en) ? '✓' : '✗ INVALID TARGET';
      console.log(`  "${vi}" → "${en}" ${valid}`);
    } else {
      console.log(`  "${vi}" → ❌ NO MAPPING DEFINED`);
    }
  }

  const missing = invalid.filter((v: string) => !VI_TO_EN[v]);
  if (missing.length > 0) {
    console.error(`\n❌ ${missing.length} value(s) have no mapping. Add entries to VI_TO_EN and re-run.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Phase 3: Dry-run (no writes yet) ─────────────────────────────
  console.log('\n⚠️  DRY RUN — no changes made yet.');
  console.log('Set DRY_RUN=false to execute.');

  if (process.env.DRY_RUN !== 'false') {
    await mongoose.disconnect();
    console.log('Done (dry run).');
    return;
  }

  // Phase 4: Apply updates ───────────────────────────────────────
  console.log('\nApplying updates...');
  for (const [vi, en] of Object.entries(VI_TO_EN)) {
    const r = await col.updateMany({ category: vi }, { $set: { category: en } });
    if (r.modifiedCount > 0) {
      console.log(`  "${vi}" → "${en}": ${r.modifiedCount} document(s) updated`);
    }
  }

  // Verify
  const remaining = await col.countDocuments({ category: { $nin: [...VALID_CATEGORIES] } });
  console.log(`\n${remaining === 0 ? '✅ All categories fixed!' : `❌ ${remaining} invalid categories remain.`}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
