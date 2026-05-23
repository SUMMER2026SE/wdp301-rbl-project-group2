import mongoose from 'mongoose';
import { UserModel } from '@/models';
import { IUser } from '@/types';
import { Role } from '@/types/user.type';
import appAssert from '@/utils/appAssert';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '@/constants/http';
import withTransaction from '@/utils/withTransaction';
import { auditUserUpdated } from '@/services/audit-log.service';
import { TUpdateMeParams } from '@/validators/auth.validator';
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

const normalizeDefaultAddress = (addresses?: any[]) => {
  if (!addresses) return addresses;
  let found = false;
  return addresses.map((a) => {
    const isDefault = Boolean(a?.isDefault);
    if (!isDefault) return { ...a, isDefault: false };
    if (found) return { ...a, isDefault: false };
    found = true;
    return { ...a, isDefault: true };
  });
};

export const updateMe = (userId: mongoose.Types.ObjectId, payload: TUpdateMeParams) =>
  withTransaction(async (session) => {
    const user = await UserModel.findById(userId).session(session);
    appAssert(user, NOT_FOUND, 'Không tìm thấy tài khoản người dùng');

    if (payload.username && payload.username !== user.username) {
      const exist = await UserModel.exists({ username: payload.username }).session(session);
      appAssert(!exist, CONFLICT, 'Tên đăng nhập đã tồn tại');
    }

    const oldData = user.omitPassword();

    const update: Partial<Record<keyof TUpdateMeParams | 'aiRecommendationsCache', any>> = {};
    if (payload.username !== undefined) update.username = payload.username;
    if (payload.phone !== undefined) update.phone = payload.phone;
    if (payload.addresses !== undefined) update.addresses = normalizeDefaultAddress(payload.addresses);
    if (payload.preferences !== undefined) {
      update.preferences = {
        dietary: payload.preferences.dietary ?? (user.preferences?.dietary ?? []),
        allergies: payload.preferences.allergies ?? (user.preferences?.allergies ?? []),
        health_goals: payload.preferences.health_goals ?? (user.preferences?.health_goals ?? []),
      };
      // Invalidate AI cache whenever health profile/preferences changes!
      update.aiRecommendationsCache = null;
    }

    const updated = await UserModel.findByIdAndUpdate(userId, update, {
      new: true,
      session,
      runValidators: true,
    });
    appAssert(updated, NOT_FOUND, 'Không tìm thấy tài khoản người dùng');

    const newData = updated.omitPassword();

    await auditUserUpdated(userId, oldData as any, newData as any, { session });

    return newData as Omit<IUser, 'password_hash'>;
  });

export const changePassword = async (
  userId: mongoose.Types.ObjectId,
  currentPassword: string,
  newPassword: string
) => {
  const user = await UserModel.findById(userId);
  appAssert(user, NOT_FOUND, 'Không tìm thấy tài khoản');

  const isMatch = await compareValue(currentPassword, user.password_hash);
  appAssert(isMatch, BAD_REQUEST, 'Mật khẩu hiện tại không đúng');

  // Gán plain text — pre-save hook sẽ tự động hash trước khi lưu
  user.password_hash = newPassword;
  await user.save();
};
