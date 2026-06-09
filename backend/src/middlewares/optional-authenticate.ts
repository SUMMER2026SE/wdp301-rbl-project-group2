import { RequestHandler } from 'express';
import { verifyToken } from '@/utils/jwt';

const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const cookieToken = req.cookies?.accessToken as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

  const accessToken = cookieToken || bearerToken;
  if (!accessToken) return next();

  const { payload } = verifyToken(accessToken);
  if (payload) {
    req.userId = payload.userId;
    req.role = payload.role;
  }

  return next();
};

export default optionalAuthenticate;
