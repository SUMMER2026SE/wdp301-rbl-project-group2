import mongoose from 'mongoose';
import { UserModel } from '@/models';
import { Role } from '@/types/user.type';
import appAssert from '@/utils/appAssert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { compareValue } from '@/utils/bcrypt';

export const getUsersByRole = async (role: Role, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    UserModel.find({ role }).select('-password_hash').skip(skip).limit(limit).lean(),
    UserModel.countDocuments({ role }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const changePassword = async (userId: mongoose.Types.ObjectId, currentPassword: string, newPassword: string) => {
  const user = await UserModel.findById(userId);
  appAssert(user, NOT_FOUND, 'Không tìm thấy tài khoản');

  const isMatch = await compareValue(currentPassword, user.password_hash);
  appAssert(isMatch, BAD_REQUEST, 'Mật khẩu hiện tại không đúng');

  // Gán plain text — pre-save hook sẽ tự động hash trước khi lưu
  user.password_hash = newPassword;
  await user.save();
};
