import dotenv from 'dotenv';
import path from 'path';

// Nạp file .env mặc định
dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (value === undefined) {
    throw new Error(`Environment variable ${key} is missing`);
  }

  return value;
};

const getNumberEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${key} must be a positive number`);
  }

  return parsed;
};

//env
export const NODE_ENV = getEnv('NODE_ENV');
export const PORT = getEnv('PORT', '8005');

//app
export const APP_ORIGIN = getEnv('APP_ORIGIN');

//auth
export const AUTH_JWT_SECRET = getEnv('AUTH_JWT_SECRET');
export const AUTH_JWT_REFRESH_SECRET = getEnv('AUTH_JWT_REFRESH_SECRET');
export const AUTH_ACCESS_TOKEN_TTL_MINUTES = getNumberEnv('AUTH_ACCESS_TOKEN_TTL_MINUTES', 60 * 24 * 7);
export const AUTH_REFRESH_TOKEN_TTL_DAYS = getNumberEnv('AUTH_REFRESH_TOKEN_TTL_DAYS', 30);

//mongo_db
export const MONGODB_URI = getEnv('MONGODB_URI');

// node_mailer
export const GOOGLE_APP_USER = getEnv('GOOGLE_APP_USER');
export const GOOGLE_APP_PASSWORD = getEnv('GOOGLE_APP_PASSWORD');
export const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID').trim();


// cloudinary
export const CLOUDINARY_CLOUD_NAME = getEnv('CLOUDINARY_CLOUD_NAME');
export const CLOUDINARY_API_KEY = getEnv('CLOUDINARY_API_KEY');
export const CLOUDINARY_API_SECRET = getEnv('CLOUDINARY_API_SECRET');

// gemini ai
export const GEMINI_API_KEY = getEnv('GEMINI_API_KEY');

// groq ai
export const GROQ_API_KEY = getEnv('GROQ_API_KEY');

//payos
export const PAYOS_CLIENT_ID = getEnv('PAYOS_CLIENT_ID');
export const PAYOS_API_KEY = getEnv('PAYOS_API_KEY');
export const PAYOS_CHECKSUM_KEY = getEnv('PAYOS_CHECKSUM_KEY');
