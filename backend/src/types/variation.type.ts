import mongoose from 'mongoose';

export interface IVariation extends mongoose.Document<mongoose.Types.ObjectId> {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVariationOption extends mongoose.Document<mongoose.Types.ObjectId> {
  variationId: mongoose.Types.ObjectId;
  name: string;
  extraPrice: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
