import 'dotenv/config';
import mongoose from 'mongoose';
import { CampaignModel } from '@/models/campaign.model';
import OrderModel from '@/models/order.model';

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const campaigns = await CampaignModel.find();
  const orders = await OrderModel.find().lean();

  console.log(`Found ${campaigns.length} campaigns and ${orders.length} orders total.`);

  for (const c of campaigns) {
    const startTimeMs = new Date(c.startTime).getTime();
    const endTimeMs = new Date(c.endTime).getTime();
    const campaignProductIds = c.products.map(p => p.productId.toString());

    // Filter paid orders that fall in this campaign's timeframe and contain at least one campaign product
    const campaignOrders = orders.filter(o => {
      const isPaid = o.payment?.paidAt || o.paid === true || o.status === 'completed' || o.status === 'delivered';
      if (!isPaid) return false;

      const orderTime = new Date(o.createdAt).getTime();
      const withinTime = orderTime >= startTimeMs && orderTime <= endTimeMs;
      if (!withinTime) return false;

      // Check if order contains any campaign product
      const hasProduct = o.items?.some((item: any) => {
        const itemProdId = item.productId?.toString();
        return itemProdId && campaignProductIds.includes(itemProdId);
      });

      return hasProduct;
    });

    const orderCount = campaignOrders.length;

    // Generate realistic traffic metrics based on orderCount
    // If orderCount is 0, give it some baseline traffic to simulate search/discovery
    const seed = c._id.toString().charCodeAt(0) + c._id.toString().charCodeAt(1);
    const baseViews = orderCount > 0 ? orderCount * 12 : (seed % 150) + 50;
    const baseClicks = orderCount > 0 ? orderCount * 3 : (seed % 30) + 10;

    const views = Math.max(10, Math.round(baseViews * (0.9 + (seed % 3) * 0.1)));
    const clicks = Math.max(5, Math.round(baseClicks * (0.8 + (seed % 4) * 0.1)));

    c.views = views;
    c.clicks = clicks;

    await c.save();
    console.log(`Updated campaign "${c.name}": views = ${views}, clicks = ${clicks}, orders count = ${orderCount} (Conversion rate = ${((orderCount / views) * 100).toFixed(1)}%)`);
  }

  await mongoose.disconnect();
  console.log('Done database update.');
};

run().catch(console.error);
