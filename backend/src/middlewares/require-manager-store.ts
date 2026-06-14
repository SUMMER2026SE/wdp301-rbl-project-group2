import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import appAssert from '@/utils/app-assert';
import { catchErrors } from '@/utils/async-handler';
import { FORBIDDEN, UNAUTHORIZED } from '@/constants/http';
import { UserModel } from '@/models';
import { Role } from '@/types/user.type';

const requireManagerStore: RequestHandler = catchErrors(async (req, _res, next) => {
  appAssert(req.userId, UNAUTHORIZED, 'Not authorized');

  const user = await UserModel.findById(req.userId).select('role storeId');
  appAssert(user, UNAUTHORIZED, 'User not found');

  appAssert(String(user.role).toLowerCase() === Role.MANAGER, FORBIDDEN, 'Manager role required');

  appAssert(user.storeId, FORBIDDEN, 'Manager account is not assigned to a store');

  req.scope = {
    ...(req.scope ?? {}),
    storeId: new mongoose.Types.ObjectId(user.storeId),
  };

  next();
});

export default requireManagerStore;
