import AppErrorCode from '@/constants/appErrorCode';
import AppError from '@/utils/AppError';
import multer from 'multer';

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Chỉ cho phép upload ảnh', 400, AppErrorCode.InvalidFileType));
    }
    cb(null, true);
  },
});

export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new AppError('Chỉ cho phép upload video', 400, AppErrorCode.InvalidFileType));
    }
    cb(null, true);
  },
});
