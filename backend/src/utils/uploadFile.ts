import cloudinary from '@/config/cloudinary';
import path from 'path';
import slugify from 'slugify';
import { randomUUID } from 'crypto';
import { UploadApiResponse } from 'cloudinary';

type TResourceType = 'image' | 'video' | 'raw' | 'auto' | undefined;
interface IUploadParams {
  file: Express.Multer.File;
  folder?: string;
  resource_type?: TResourceType;
  prefix?: string;
}

interface IUploadMultiFilesParams {
  files: Express.Multer.File[];
  folder: string;
  resource_type: TResourceType;
  prefix?: string;
}

/**
 * Tạo tên file an toàn cho storage (MinIO/S3)
 * @param originalName Tên file gốc từ client
 * @returns Tên file đã slugify, giữ extension
 */
const decodeOriginalName = (name: string) => Buffer.from(name, 'latin1').toString('utf8');

export const slugifyFileName = (originalNameRaw: string) => {
  const originalName = decodeOriginalName(originalNameRaw);

  // Lấy extension
  const ext = path.extname(originalName); // ví dụ: '.png'
  const nameWithoutExt = path.basename(originalName, ext);

  // Slugify phần tên file
  const safeName = slugify(nameWithoutExt, {
    replacement: '-', // thay khoảng trắng bằng '-'
    remove: /[<>:"/\\|?*~`!@#$%^&+=]/g, // loại bỏ các ký tự đặc biệt
    lower: true, // chuyển thành chữ thường
    strict: true, // chỉ giữ chữ, số và replacement
    locale: 'vi', // hỗ trợ tiếng Việt
    trim: true, // bỏ dấu '-' ở đầu/cuối
  });

  // Ghép lại với extension
  return `${safeName}${ext.toLowerCase()}`;
};

export const uploadBuffer = ({ file, prefix = '', folder = 'images', resource_type = 'image' }: IUploadParams) => {
  const public_id = `${prefix}/${randomUUID()}/${slugifyFileName(file.originalname)}`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type,
          public_id,
        },
        (error, result) => {
          if (error) reject(error);
          else {
            if (!result) return null;
            const { public_id, secure_url, resource_type, width, height, bytes, format, asset_folder: folder } = result;
            resolve({
              public_id,
              secure_url,
              resource_type,
              width,
              height,
              bytes,
              format,
              folder,
            });
          }
        }
      )
      .end(file.buffer);
  });
};

export const uploadMultipleBuffers = async ({
  files,
  folder,
  resource_type = 'image',
  prefix,
}: IUploadMultiFilesParams) => {
  const uploads = files.map((file: Express.Multer.File) =>
    uploadBuffer({
      file,
      folder,
      resource_type,
      prefix,
    })
  );

  return Promise.all(uploads);
};

export const uploadVideoBuffer = ({ file, prefix = '', folder = 'videos' }: IUploadParams) => {
  return uploadBuffer({
    file,
    folder,
    resource_type: 'video',
    prefix,
  });
};

export const deleteFile = async (public_id: string, resource_type = 'image') => {
  return cloudinary.uploader.destroy(public_id, {
    resource_type,
  });
};

export const deleteByPrefix = async ({
  prefix,
  resource_type = 'image',
}: {
  prefix: string;
  resource_type?: TResourceType;
}) => {
  let nextCursor = null;
  const deleted = [];

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      resource_type,
      max_results: 100,
      next_cursor: nextCursor,
    });

    const publicIds = result.resources.map((r: any) => r.public_id);

    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds, {
        resource_type,
      });
      deleted.push(...publicIds);
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  return deleted;
};
