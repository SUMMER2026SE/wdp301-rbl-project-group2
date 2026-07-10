import { ConnectionOptions } from 'bullmq';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '@/constants/env';

export const redisConfig: ConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
};
