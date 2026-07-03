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

export enum FileModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum FileModerationCategory {
  NONE = 'none',
  SEXUAL = 'sexual',
  VIOLENCE = 'violence',
  HATE = 'hate',
  SELF_HARM = 'self_harm',
  ILLEGAL = 'illegal',
  SPAM = 'spam',
  PRIVATE_INFO = 'private_info',
  OTHER = 'other',
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

  moderationStatus?: FileModerationStatus;
  moderationCategory?: FileModerationCategory;
  moderationConfidence?: number;
  moderationReason?: string;
  moderatedAt?: Date | null;
}
