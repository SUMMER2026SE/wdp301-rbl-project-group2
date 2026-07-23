import { randomUUID } from 'crypto';
import { CHAT_REQUEST_DEADLINE_MS } from '@/constants/env';

const DEFAULT_CHAT_DEADLINE_MS = CHAT_REQUEST_DEADLINE_MS;

export interface ChatRequestContext {
  traceId: string;
  startedAt: number;
  deadlineAt: number;
  signal: AbortSignal;
  abort: () => void;
}

export const createChatRequestContext = (timeoutMs = DEFAULT_CHAT_DEADLINE_MS): ChatRequestContext => {
  const controller = new AbortController();
  const startedAt = Date.now();
  return {
    traceId: randomUUID(),
    startedAt,
    deadlineAt: startedAt + timeoutMs,
    signal: controller.signal,
    abort: () => controller.abort(),
  };
};

export const getRemainingMs = (context: ChatRequestContext) => Math.max(context.deadlineAt - Date.now(), 0);

export const assertDeadline = (context: ChatRequestContext, minRemainingMs = 100) => {
  if (context.signal.aborted || getRemainingMs(context) < minRemainingMs) {
    throw new Error('Chat request deadline exceeded');
  }
};

export const withChatDeadline = async <T>(
  context: ChatRequestContext | undefined,
  promiseFactory: () => Promise<T>,
  stageTimeoutMs: number,
  label: string,
  minRemainingMs = 150
): Promise<T> => {
  if (!context) {
    return withLocalTimeout(promiseFactory(), stageTimeoutMs, label);
  }

  assertDeadline(context, minRemainingMs);
  const timeoutMs = Math.min(stageTimeoutMs, getRemainingMs(context));
  return withLocalTimeout(promiseFactory(), timeoutMs, label);
};

const withLocalTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
