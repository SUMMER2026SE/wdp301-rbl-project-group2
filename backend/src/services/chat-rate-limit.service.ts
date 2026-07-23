import Redis from 'ioredis';
import { NODE_ENV } from '@/constants/env';
import { redisConfig } from '@/config/redis';

type ChatActor = {
  userId?: string;
  ip: string;
};

type ChatLimitLease = {
  concurrencyKey?: string;
};

const redis = new Redis({
  host: (redisConfig as any).host,
  port: (redisConfig as any).port,
  password: (redisConfig as any).password,
});

redis.on('error', (err) => {
  if (NODE_ENV !== 'production') {
    console.warn('[Redis] chat rate limiter unavailable:', err.message);
  }
});

const sanitizeKeyPart = (value: string) => value.replace(/[^a-zA-Z0-9:_-]/g, '_');

const incrementWithTtl = async (key: string, ttlSeconds: number) => {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
};

export const acquireChatLimit = async (actor: ChatActor): Promise<ChatLimitLease> => {
  const actorKey = actor.userId ? `user:${actor.userId}` : `guest:${sanitizeKeyPart(actor.ip)}`;
  const dailyLimit = actor.userId ? 20 : 5;
  const burstLimit = actor.userId ? 6 : 3;
  const maxConcurrent = actor.userId ? 2 : 1;
  const today = new Date().toISOString().split('T')[0];

  try {
    const burstCount = await incrementWithTtl(`chat_limit:burst:${actorKey}`, 60);
    if (burstCount > burstLimit) {
      throw Object.assign(new Error('Bạn đang gửi câu hỏi quá nhanh. Vui lòng chờ một chút rồi thử lại nhé!'), {
        statusCode: 429,
      });
    }

    const concurrencyKey = `chat_limit:concurrent:${actorKey}`;
    const concurrentCount = await incrementWithTtl(concurrencyKey, 30);
    if (concurrentCount > maxConcurrent) {
      await redis.decr(concurrencyKey);
      throw Object.assign(new Error('Bạn đang có một yêu cầu chatbot khác đang xử lý. Vui lòng chờ yêu cầu đó hoàn tất nhé!'), {
        statusCode: 429,
      });
    }

    const dailyCount = await incrementWithTtl(`chat_limit:day:${actorKey}:${today}`, 86_400);
    if (dailyCount > dailyLimit) {
      await redis.decr(concurrencyKey);
      throw Object.assign(new Error('Bạn đã dùng hết lượt tư vấn AI hôm nay. Hãy quay lại vào ngày mai nhé!'), {
        statusCode: 429,
      });
    }

    return { concurrencyKey };
  } catch (error) {
    if ((error as any).statusCode) throw error;

    if (!actor.userId || NODE_ENV === 'production') {
      throw Object.assign(new Error('Hệ thống giới hạn lượt hỏi đang tạm thời không khả dụng. Vui lòng thử lại sau.'), {
        statusCode: 503,
      });
    }

    console.warn('[ChatRateLimit] Redis lỗi, cho user đã đăng nhập đi tiếp ở môi trường không production.');
    return {};
  }
};

export const releaseChatLimit = async (lease?: ChatLimitLease) => {
  if (!lease?.concurrencyKey) return;
  try {
    const value = await redis.decr(lease.concurrencyKey);
    if (value <= 0) {
      await redis.del(lease.concurrencyKey);
    }
  } catch (error) {
    console.warn('[ChatRateLimit] Không thể release concurrency key.');
  }
};
