import 'dotenv/config';
import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { CampaignModel, CampaignProductModel } from '@/models/campaign.model';
import CartModel, { CartItemModel } from '@/models/cart.model';
import OrderModel, { OrderItemModel } from '@/models/order.model';
import ReviewModel from '@/models/review.model';
import { ProductRecipeModel } from '@/models/ingredient.model';

const MAIN_STORE_ID = '60c72b2f9b1d8b2a3c8b4567';

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // 1. Get all products (including those with storeId, which are still in DB as raw docs)
  const products = await ProductModel.find().lean();
  console.log(`Found ${products.length} products in database.`);

  // 2. Group products by normalized name
  const groups = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  }

  console.log(`Grouped into ${groups.size} unique products.`);

  let totalDeleted = 0;

  for (const [name, list] of groups.entries()) {
    if (list.length <= 1) continue;

    // Identify canonical copy
    let canonical = list.find(p => (p as any).storeId?.toString() === MAIN_STORE_ID);
    if (!canonical) {
      canonical = list[0];
    }

    const canonicalId = canonical._id;
    const duplicateIds = list
      .filter(p => p._id.toString() !== canonicalId.toString())
      .map(p => p._id);

    console.log(`Product "${canonical.name}": canonical ID is ${canonicalId}. Duplicates: ${duplicateIds.join(', ')}`);

    // Update references
    // campaigns
    const campaigns = await CampaignModel.find({ 'products.productId': { $in: duplicateIds } });
    for (const camp of campaigns) {
      let updated = false;
      camp.products = camp.products.map(item => {
        if (duplicateIds.some(dupId => dupId.toString() === item.productId.toString())) {
          item.productId = canonicalId;
          updated = true;
        }
        return item;
      });
      if (updated) {
        await camp.save();
        console.log(`  Updated product ID in campaign: ${camp.name} (${camp._id})`);
      }
    }

    // campaign_products
    const campProducts = await CampaignProductModel.find({ productIds: { $in: duplicateIds } });
    for (const cp of campProducts) {
      const updatedIds = cp.productIds.map(id => 
        duplicateIds.some(dupId => dupId.toString() === id.toString()) ? canonicalId : id
      );
      // Deduplicate IDs
      cp.productIds = [...new Set(updatedIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
      await cp.save();
      console.log(`  Updated product ID in campaign_product document: ${cp._id}`);
    }

    // carts (embedded items)
    const carts = await CartModel.find({ 'items.productId': { $in: duplicateIds } });
    for (const cart of carts) {
      let updated = false;
      cart.items = cart.items.map(item => {
        if (duplicateIds.some(dupId => dupId.toString() === item.productId.toString())) {
          item.productId = canonicalId;
          updated = true;
        }
        return item;
      });
      if (updated) {
        await cart.save();
        console.log(`  Updated product ID in cart of customer: ${cart.cusId} (${cart._id})`);
      }
    }

    // cart_items
    const cartItemsResult = await CartItemModel.updateMany(
      { productId: { $in: duplicateIds } },
      { $set: { productId: canonicalId } }
    );
    if (cartItemsResult.modifiedCount > 0) {
      console.log(`  Updated ${cartItemsResult.modifiedCount} cart_items doc(s).`);
    }

    // orders (embedded items)
    const orders = await OrderModel.find({ 'items.productId': { $in: duplicateIds } });
    for (const order of orders) {
      let updated = false;
      order.items = order.items.map(item => {
        if (duplicateIds.some(dupId => dupId.toString() === item.productId.toString())) {
          item.productId = canonicalId;
          updated = true;
        }
        return item;
      });
      if (updated) {
        // use updateOne to bypass strict Mongoose validation if schema has changed
        await OrderModel.updateOne({ _id: order._id }, { $set: { items: order.items } });
        console.log(`  Updated product ID in order items of code: ${order.code} (${order._id})`);
      }
    }

    // order_items
    const orderItemsResult = await OrderItemModel.updateMany(
      { productId: { $in: duplicateIds } },
      { $set: { productId: canonicalId } }
    );
    if (orderItemsResult.modifiedCount > 0) {
      console.log(`  Updated ${orderItemsResult.modifiedCount} order_items doc(s).`);
    }

    // reviews
    const reviewsResult = await ReviewModel.updateMany(
      { productId: { $in: duplicateIds } },
      { $set: { productId: canonicalId } }
    );
    if (reviewsResult.modifiedCount > 0) {
      console.log(`  Updated ${reviewsResult.modifiedCount} reviews doc(s).`);
    }

    // product_recipes
    const recipesResult = await ProductRecipeModel.updateMany(
      { productId: { $in: duplicateIds } },
      { $set: { productId: canonicalId } }
    );
    if (recipesResult.modifiedCount > 0) {
      console.log(`  Updated ${recipesResult.modifiedCount} product_recipes doc(s).`);
    }

    // Delete duplicate products
    const delResult = await ProductModel.deleteMany({ _id: { $in: duplicateIds } });
    totalDeleted += delResult.deletedCount;
    console.log(`  Deleted ${delResult.deletedCount} duplicate products.`);
  }

  // 3. Unset storeId from all products
  console.log('Unsetting storeId from all products...');
  const unsetResult = await ProductModel.updateMany({}, { $unset: { storeId: '' } }, { strict: false });
  console.log(`Updated ${unsetResult.modifiedCount} product docs to remove storeId.`);

  const finalCount = await ProductModel.countDocuments();
  console.log(`Finished migration! Remaining products count: ${finalCount} (Deleted ${totalDeleted} duplicates).`);

  await mongoose.disconnect();
};

run().catch(console.error);
