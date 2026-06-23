import mongoose from 'mongoose';

export interface ICampaignProductItem {
  productId: mongoose.Types.ObjectId;
  fixedPrice?: number | null;
  discount?: number | null;
}

export enum CampaignStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ICampaign extends mongoose.Document<mongoose.Types.ObjectId> {
  name: string;
  type: string;
  status: CampaignStatus;
  createdBy: mongoose.Types.ObjectId;
  storeIds?: mongoose.Types.ObjectId[];
  products: ICampaignProductItem[];
  startTime: Date;
  endTime: Date;
  views?: number;
  clicks?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampaignProduct extends mongoose.Document<mongoose.Types.ObjectId> {
  campaignIds: mongoose.Types.ObjectId[];
  productIds: mongoose.Types.ObjectId[];
  fixedPrice?: number | null;
  discount?: number | null;
  createdAt: Date;
}
