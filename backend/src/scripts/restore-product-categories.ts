/**
 * Rollback: Restore Vietnamese product categories.
 *
 * After the initial migration merged 5 Vietnamese categories into 'food',
 * this script re-assigns the correct Vietnamese category based on
 * product name heuristics.
 *
 * Run: pnpm exec ts-node -r tsconfig-paths/register src/scripts/restore-product-categories.ts
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// ── Heuristics: infer original Vietnamese category from product name ─────
function inferCategory(name: string): string | null {
  const lower = name.toLowerCase();

  // Cơm Đĩa Truyền Thống
  if (lower.includes('cơm') || lower.includes('cơm tấm')) {
    return 'Cơm Đĩa Truyền Thống';
  }

  // Trứ Danh Món Nước (phở, bún, hủ tiếu, mì, miến, cháo, cao lầu)
  if (
    lower.includes('phở') ||
    lower.includes('bún') ||
    lower.includes('hủ tiếu') ||
    lower.includes('mì quảng') ||
    lower.includes('mì xá xíu') ||
    lower.includes('cao lầu') ||
    lower.includes('miến') ||
    lower.includes('bánh canh') ||
    lower.includes('cháo')
  ) {
    return 'Trứ Danh Món Nước';
  }

  // Giải Khát & Tráng Miệng (đồ uống, tráng miệng)
  if (
    lower.includes('trà') ||
    lower.includes('cà phê') ||
    lower.includes('matcha') ||
    lower.includes('sinh tố') ||
    lower.includes('nước ép') ||
    lower.includes('nước sâm') ||
    lower.includes('sữa bắp') ||
    lower.includes('hạt sen') ||
    lower.includes('soda') ||
    lower.includes('chanh') ||
    lower.includes('kem') ||
    lower.includes('bánh ngọt') ||
    lower.includes('chè') ||
    lower.includes('đá xay') ||
    lower.includes('latte') ||
    lower.includes('socola') ||
    lower.includes('flan') ||
    lower.includes('caramel') ||
    lower.includes('tráng miệng')
  ) {
    return 'Giải Khát & Tráng Miệng';
  }

  // Góc Healthy & Ăn Kiêng
  if (
    lower.includes('salad') ||
    lower.includes('rau') ||
    lower.includes('healthy') ||
    lower.includes('ăn kiêng') ||
    lower.includes('low-carb') ||
    lower.includes('rau củ') ||
    lower.includes('nộm') ||
    (lower.includes('gỏi') && !lower.includes('gỏi cuốn'))
  ) {
    return 'Góc Healthy & Ăn Kiêng';
  }

  // Gọi Thêm Ăn Kèm
  if (
    lower.includes('khoai tây') ||
    lower.includes('khoai tây chiên') ||
    lower.includes('nem') ||
    lower.includes('chả giò') ||
    lower.includes('gỏi cuốn') ||
    lower.includes('xôi') ||
    lower.includes('canh') ||
    lower.includes('súp') ||
    lower.includes('kim chi') ||
    lower.includes('thêm') ||
    lower.includes('bò viên') ||
    lower.includes('quẩy') ||
    lower.includes('tóp mỡ') ||
    lower.includes('trứng luộc')
  ) {
    return 'Gọi Thêm Ăn Kèm';
  }

  return null;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI env var is missing');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  const col = mongoose.connection.db.collection('products');

  // Chỉ xét các product đang có category là giá trị English enum
  // (đã bị migration trước ghi đè từ category Việt)
  const ENGLISH_ENUMS = ['food', 'drink', 'combo', 'other'];
  const products = await col
    .find({ category: { $in: ENGLISH_ENUMS } })
    .project({ name: 1, category: 1 })
    .toArray();
  console.log(`\nFound ${products.length} product(s) with English category values (to be restored).`);

  if (products.length === 0) {
    console.log('✅ Nothing to restore.');
    await mongoose.disconnect();
    return;
  }

  // Phase 1: Dry-run preview ────────────────────────────────────
  const byCategory: Record<string, number> = {};
  let unmatched = 0;

  console.log('\n--- Dry-run preview ---');
  for (const p of products) {
    const inferred = inferCategory(p.name);
    if (inferred) {
      byCategory[inferred] = (byCategory[inferred] || 0) + 1;
    } else {
      unmatched++;
      console.log(`  ❌ Unmatched: "${p.name}"`);
    }
  }

  console.log('\nProposed restoration:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  "${cat}": ${count} product(s)`);
  }
  console.log(`  Unmatched: ${unmatched} product(s)`);

  if (unmatched > 0) {
    console.log(`\n⚠️  ${unmatched} product(s) couldn't be matched.`);
  }

  console.log(`\n⚠️  DRY RUN — no changes made. Set DRY_RUN=false to execute.`);
  if (process.env.DRY_RUN !== 'false') {
    await mongoose.disconnect();
    return;
  }

  // Phase 2: Apply ─────────────────────────────────────────────
  console.log('\nApplying updates...');
  let updated = 0;
  for (const p of products) {
    const inferred = inferCategory(p.name);
    if (!inferred) continue;
    await col.updateOne({ _id: p._id }, { $set: { category: inferred } });
    updated++;
  }

  console.log(`✅ ${updated} product(s) restored to Vietnamese categories.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Restore failed:', err);
  process.exit(1);
});
