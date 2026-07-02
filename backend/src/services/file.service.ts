import { FileModel } from '@/models';
import { FileModerationCategory, FileModerationStatus, FileOwnerType, ResourceType } from '@/types/file.type';
import { uploadBuffer, deleteFile } from '@/utils/upload-file';
import { NOT_FOUND, BAD_REQUEST } from '@/constants/http';
import appAssert from '@/utils/app-assert';
import mongoose from 'mongoose';

const REVIEW_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface UploadFileParams {
  file: Express.Multer.File;
  ownerType: FileOwnerType;
  ownerId?: string | mongoose.Types.ObjectId;
  folder?: string;
  prefix?: string;
}

const assertReviewImageMimeType = (file: Express.Multer.File) => {
  appAssert(
    REVIEW_IMAGE_MIME_TYPES.has(file.mimetype),
    BAD_REQUEST,
    'Anh review chi ho tro dinh dang JPEG, PNG hoac WebP'
  );
};

export const uploadAndSaveFile = async ({
  file,
  ownerType,
  ownerId,
  folder = 'products',
  prefix = 'product',
}: UploadFileParams) => {
  appAssert(file, BAD_REQUEST, 'Khong tim thay file de upload');

  if (ownerType === FileOwnerType.REVIEW) {
    assertReviewImageMimeType(file);
  }

  const cloudinaryResult = (await uploadBuffer({ file, folder, prefix })) as {
    public_id: string;
    secure_url: string;
    resource_type: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
    folder: string;
  };

  const isReviewImage = ownerType === FileOwnerType.REVIEW;
  const fileDoc = await FileModel.create({
    public_id: cloudinaryResult.public_id,
    secure_url: cloudinaryResult.secure_url,
    resource_type: ResourceType.IMAGE,
    width: cloudinaryResult.width ?? 0,
    height: cloudinaryResult.height ?? 0,
    bytes: cloudinaryResult.bytes ?? 0,
    format: cloudinaryResult.format ?? '',
    folder: cloudinaryResult.folder ?? folder,
    owner_id: ownerId ? new mongoose.Types.ObjectId(ownerId) : new mongoose.Types.ObjectId(),
    owner_type: ownerType,
    moderationStatus: isReviewImage ? FileModerationStatus.PENDING : FileModerationStatus.APPROVED,
    moderationCategory: FileModerationCategory.NONE,
    moderationConfidence: 0,
    moderationReason: '',
    moderatedAt: null,
  });

  return fileDoc;
};

export const getFileById = async (id: string) => {
  const file = await FileModel.findById(id).lean();
  appAssert(file, NOT_FOUND, 'Khong tim thay file');
  return file;
};

export const removeFile = async (fileId: string) => {
  const file = await FileModel.findById(fileId);
  appAssert(file, NOT_FOUND, 'Khong tim thay file de xoa');

  await deleteFile(file.public_id, file.resource_type);
  await FileModel.findByIdAndDelete(fileId);

  return { deleted: true };
};