import mongoose from 'mongoose';

export interface ICampaignProductItem {
  productId: mongoose.Types.ObjectId;
  fixedPrice?: number | null;
  discount?: number | null;
}

export interface ICampaign extends mongoose.Document<mongoose.Types.ObjectId> {
  name: string;
  type: string;
  storeIds: mongoose.Types.ObjectId[];
  products: ICampaignProductItem[];
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampaignProduct extends mongoose.Document<mongoose.Types.ObjectId> {
  campaignId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  fixedPrice?: number | null;
  discount?: number | null;
  createdAt: Date;
}
