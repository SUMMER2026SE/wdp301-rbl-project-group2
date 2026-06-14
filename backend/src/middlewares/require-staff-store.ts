import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { FORBIDDEN, UNAUTHORIZED } from '@/constants/http';
import { UserModel } from '@/models';
import { Role } from '@/types/user.type';
import appAssert from '@/utils/app-assert';
import { catchErrors } from '@/utils/async-handler';

const getClientStoreId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
};

export const requireStaffStore: RequestHandler = catchErrors(async (req, _res, next) => {
  appAssert(req.userId, UNAUTHORIZED, 'Not authorized');

  const user = await UserModel.findById(req.userId).select('role storeId');
  appAssert(user, UNAUTHORIZED, 'User not found');
  appAssert(String(user.role).toLowerCase() === Role.STAFF, FORBIDDEN, 'Staff role required');

  const authStoreId = user.storeId?.toString();
  appAssert(authStoreId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');

  const requestedStoreId = getClientStoreId(req.query.storeId) ?? getClientStoreId(req.body?.storeId);

  appAssert(
    !requestedStoreId || requestedStoreId === authStoreId,
    FORBIDDEN,
    'Bạn không có quyền thao tác chi nhánh này'
  );

  req.scope = {
    ...(req.scope ?? {}),
    storeId: new mongoose.Types.ObjectId(authStoreId),
  };

  next();
});

export default requireStaffStore;
