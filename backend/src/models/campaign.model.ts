import { CampaignStatus, ICampaign, ICampaignProduct } from '@/types/campaign.type';
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
    status: { type: String, enum: CampaignStatus, default: CampaignStatus.PENDING, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }], default: [] },
    products: { type: [CampaignProductItemSchema], default: [] },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
CampaignSchema.index({ startTime: 1, endTime: 1 });

export const CampaignModel = mongoose.model<ICampaign>('Campaign', CampaignSchema, 'campaigns');

// --- CAMPAIGN PRODUCTS ---
const CampaignProductSchema = new mongoose.Schema<ICampaignProduct>(
  {
    campaignIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }],
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    fixedPrice: { type: Number, default: null },
    discount: { type: Number, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
CampaignProductSchema.index({ campaignIds: 1 });
CampaignProductSchema.index({ productIds: 1 });

export const CampaignProductModel = mongoose.model<ICampaignProduct>('CampaignProduct', CampaignProductSchema, 'campaign_products');
