import { RequestHandler } from 'express';
import appAssert from '../utils/appAssert';
import { catchErrors } from '../utils/asyncHandler';
import AppErrorCode from '@/constants/appErrorCode';
import { UNAUTHORIZED } from '@/constants/http';
import { verifyToken } from '@/utils/jwt';
import { UserModel } from '@/models';

const getAccessTokenFromRequest = (req: Parameters<RequestHandler>[0]) => {
  const cookieToken = req.cookies.accessToken as string | undefined;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return undefined;
};

const authenticate: RequestHandler = catchErrors(async (req, res, next) => {
  const accessToken = getAccessTokenFromRequest(req);
  appAssert(accessToken, UNAUTHORIZED, 'Not authorized', AppErrorCode.InvalidAccessToken);

  const { error, payload } = verifyToken(accessToken);
  appAssert(
    payload,
    UNAUTHORIZED,
    error === 'jwt expired' ? 'Token expired' : 'Invalid token',
    AppErrorCode.InvalidAccessToken
  );

  // Check if user is valid
  const user = await UserModel.findById(payload.user_id);
  appAssert(user, UNAUTHORIZED, 'User not found', AppErrorCode.InvalidAccessToken);

  req.userId = payload.user_id;
  req.role = payload.role;
  next();
});

export default authenticate;
