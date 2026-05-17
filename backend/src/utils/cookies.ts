import { CookieOptions, Response } from 'express';
import { AUTH_ACCESS_TOKEN_TTL_MINUTES, AUTH_REFRESH_TOKEN_TTL_DAYS } from '@/constants/env';
import { daysFromNow, minutesFromNow } from './date';

const secure = process.env.NODE_ENV !== 'development';
export const REFRESH_PATH = '/api/auth/refresh';

const defaults: CookieOptions = {
  sameSite: 'none',
  secure: true,
  httpOnly: true,
};

export const getAccessTokenCookieOptions = (): CookieOptions => ({
  ...defaults,
  expires: minutesFromNow(AUTH_ACCESS_TOKEN_TTL_MINUTES),
});

export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  ...defaults,
  expires: daysFromNow(AUTH_REFRESH_TOKEN_TTL_DAYS),
  path: REFRESH_PATH,
});

type Params = {
  res: Response;
  accessToken: string;
  refreshToken: string;
  deviceId?: string;
};

export const setAuthCookies = ({ res, accessToken, refreshToken, deviceId }: Params): Response => {
  return res
    .cookie('accessToken', accessToken, getAccessTokenCookieOptions())
    .cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions())
    .cookie('deviceId', deviceId);
};

export const clearAuthCookies = (res: Response) => {
  return res
    .clearCookie('accessToken')
    .clearCookie('refreshToken', {
      path: REFRESH_PATH,
    })
    .clearCookie('deviceId');
};
