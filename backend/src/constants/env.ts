import dotenv from 'dotenv';

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

const getOptionalEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value === undefined || value === '' ? undefined : value;
};

const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return /^(true|1|yes)$/i.test(value);
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
export const ATLAS_PRODUCT_SEARCH_INDEX = getEnv('ATLAS_PRODUCT_SEARCH_INDEX', 'product_text_search');
export const ATLAS_PRODUCT_VECTOR_INDEX = getEnv('ATLAS_PRODUCT_VECTOR_INDEX', 'product_vector_search');

// redis / queue
export const REDIS_HOST = getEnv('REDIS_HOST', 'redis');
export const REDIS_PORT = getNumberEnv('REDIS_PORT', 6379);
export const REDIS_PASSWORD = getOptionalEnv('REDIS_PASSWORD');

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
export const GEMINI_MODEL = getEnv('GEMINI_MODEL', 'gemini-2.5-flash');
export const GEMINI_VISION_MODELS = getEnv('GEMINI_VISION_MODELS', `${GEMINI_MODEL},gemini-2.5-flash,gemini-2.0-flash`);

// groq ai
export const GROQ_API_KEY = getEnv('GROQ_API_KEY');

// ai microservice / retraining
export const AI_MICROSERVICE_URL = getEnv('AI_MICROSERVICE_URL', 'http://localhost:8001');
export const AI_RETRAIN_TOKEN = getOptionalEnv('AI_RETRAIN_TOKEN');
export const AI_AUTO_RETRAIN_ON_ORDER_COMPLETED = getBooleanEnv('AI_AUTO_RETRAIN_ON_ORDER_COMPLETED', false);
export const AI_RETRAIN_MIN_INTERVAL_MS = getNumberEnv('AI_RETRAIN_MIN_INTERVAL_MS', 3_600_000);

//payos
export const PAYOS_CLIENT_ID = getEnv('PAYOS_CLIENT_ID');
export const PAYOS_API_KEY = getEnv('PAYOS_API_KEY');
export const PAYOS_CHECKSUM_KEY = getEnv('PAYOS_CHECKSUM_KEY');

// weather
export const OPENWEATHER_API_KEY = getEnv('OPENWEATHER_API_KEY', '');

// order jobs
export const ORDER_AUTO_COMPLETE_DELAY_MINUTES = getNumberEnv('ORDER_AUTO_COMPLETE_DELAY_MINUTES', 30);
