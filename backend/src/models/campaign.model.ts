import { ICampaign, ICampaignProduct } from '@/types/campaign.type';
import mongoose from 'mongoose';

const CampaignProductItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    fixedPrice: { type: Number, default: null },
    discount: { type: Number, default: null },
  },
  { _id: false }
);

// --- CAMPAIGNS ---
const CampaignSchema = new mongoose.Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    storeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }],
    products: { type: [CampaignProductItemSchema], default: [] },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
CampaignSchema.index({ storeIds: 1 });
CampaignSchema.index({ startTime: 1, endTime: 1 });

export const CampaignModel = mongoose.model<ICampaign>('Campaign', CampaignSchema, 'campaigns');

// --- CAMPAIGN PRODUCTS ---
const CampaignProductSchema = new mongoose.Schema<ICampaignProduct>(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    fixedPrice: { type: Number, default: null },
    discount: { type: Number, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
CampaignProductSchema.index({ campaignId: 1, productId: 1 }, { unique: true });
CampaignProductSchema.index({ productId: 1 });

export const CampaignProductModel = mongoose.model<ICampaignProduct>('CampaignProduct', CampaignProductSchema, 'campaign_products');
