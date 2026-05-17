import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { AUTH_ACCESS_TOKEN_TTL_MINUTES, AUTH_JWT_SECRET } from '@/constants/env';
import crypto from 'crypto';
import { IUser as UserDocument } from '@/types';
import { Role } from '@/types/user.type';

export type AccessTokenPayload = {
  user_id: UserDocument['_id'];
  role: Role;
  device_id: string;
};

type SignOptionsAndSecret = SignOptions & { secret: string };

const defaults: SignOptions = {
  audience: 'user',
};

const accessTokenSignOptions: SignOptionsAndSecret = {
  expiresIn: `${AUTH_ACCESS_TOKEN_TTL_MINUTES}m`,
  secret: AUTH_JWT_SECRET,
};

export const signToKen = (payload: AccessTokenPayload, options?: SignOptionsAndSecret) => {
  const { secret, ...signOpts } = options || accessTokenSignOptions;
  return jwt.sign(payload, secret, { ...defaults, ...signOpts });
};

export const verifyToken = <TPayload extends object = AccessTokenPayload>(
  token: string,
  options?: VerifyOptions & { secret: string }
) => {
  const { secret = AUTH_JWT_SECRET, ...verifyOpts } = options || {};
  try {
    const payload = jwt.verify(token, secret, {
      ...(defaults as VerifyOptions),
      ...verifyOpts,
    }) as TPayload;
    return { payload };
  } catch (error: any) {
    return {
      error: error.message,
    };
  }
};

export function generateRefreshToken() {
  return crypto.randomBytes(128).toString('hex');
}
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
