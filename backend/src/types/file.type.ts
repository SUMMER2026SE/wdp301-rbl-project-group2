import mongoose from 'mongoose';

export enum ResourceType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export enum FileOwnerType {
  USER = 'user',
  PRODUCT = 'product',
  CATEGORY = 'category',
  REVIEW = 'review',
}

export default interface IFile extends mongoose.Document {
  public_id: string;
  secure_url: string;
  resource_type: ResourceType;

  width: number;
  height: number;
  bytes: number;
  format: string;

  folder: string;
  owner_id: mongoose.Types.ObjectId;
  owner_type: FileOwnerType;
}
