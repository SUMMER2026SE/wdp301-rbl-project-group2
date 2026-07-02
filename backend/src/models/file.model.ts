import IFile, { FileModerationCategory, FileModerationStatus, ResourceType } from '@/types/file.type';
import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema<IFile>(
  {
    public_id: { type: String, required: true },
    secure_url: { type: String, required: true },
    resource_type: { type: String, required: true, enum: ResourceType, default: ResourceType.IMAGE },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
    format: { type: String, required: true }, // image, video, document
    folder: { type: String, required: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    owner_type: { type: String, required: true },
    moderationStatus: {
      type: String,
      enum: FileModerationStatus,
      default: FileModerationStatus.APPROVED,
    },
    moderationCategory: {
      type: String,
      enum: FileModerationCategory,
      default: FileModerationCategory.NONE,
    },
    moderationConfidence: { type: Number, min: 0, max: 1, default: 0 },
    moderationReason: { type: String, default: '' },
    moderatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

//indexes
FileSchema.index({ public_id: 1 }, { unique: true });
FileSchema.index({ resource_type: 1, owner_id: 1, owner_type: 1 });
FileSchema.index({ owner_type: 1, moderationStatus: 1 });

const FileModel = mongoose.model<IFile>('File', FileSchema, 'files');

export default FileModel;
