import { FileModel } from '@/models';
import { FileOwnerType, ResourceType } from '@/types/file.type';
import { uploadBuffer, deleteFile } from '@/utils/uploadFile';
import { NOT_FOUND, BAD_REQUEST } from '@/constants/http';
import appAssert from '@/utils/appAssert';
import mongoose from 'mongoose';
interface UploadFileParams {
  file: Express.Multer.File;
  ownerType: FileOwnerType;
  ownerId?: string | mongoose.Types.ObjectId;
  folder?: string;
  prefix?: string;
}

/**
 * Upload file lên Cloudinary rồi lưu metadata vào MongoDB.
 * Trả về document IFile với _id để gán vào các entity khác (Product, User,...).
 */
export const uploadAndSaveFile = async ({
  file,
  ownerType,
  ownerId,
  folder = 'products',
  prefix = 'product',
}: UploadFileParams) => {
  // Validate file exists
  appAssert(file, BAD_REQUEST, 'Không tìm thấy file để upload');

  // Upload lên Cloudinary — uploadBuffer trả về raw cloudinary response
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

  // Lưu metadata vào MongoDB File collection
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
  });

  return fileDoc;
};

/**
 * Lấy thông tin file theo ID
 */
export const getFileById = async (id: string) => {
  const file = await FileModel.findById(id).lean();
  appAssert(file, NOT_FOUND, 'Không tìm thấy file');
  return file;
};

/**
 * Xoá file khỏi cả Cloudinary lẫn MongoDB.
 * Dùng khi delete product hoặc thay thế ảnh.
 */
export const removeFile = async (fileId: string) => {
  const file = await FileModel.findById(fileId);
  appAssert(file, NOT_FOUND, 'Không tìm thấy file để xoá');

  // Xoá trên Cloudinary
  await deleteFile(file.public_id, file.resource_type);

  // Xoá trong DB
  await FileModel.findByIdAndDelete(fileId);

  return { deleted: true };
};
