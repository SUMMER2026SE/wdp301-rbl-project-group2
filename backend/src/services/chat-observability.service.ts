import { ChatRequestContext, getRemainingMs } from './chat-deadline.service';

export const logChatStage = (
  context: ChatRequestContext | undefined,
  stage: string,
  metadata: Record<string, unknown> = {}
) => {
  const base = context
    ? {
        traceId: context.traceId,
        elapsedMs: Date.now() - context.startedAt,
        remainingMs: getRemainingMs(context),
      }
    : {};

  // Log chỉ chứa metadata vận hành đã rút gọn, không log raw message/token/cookie/payment payload.
  console.log('[ChatTrace]', JSON.stringify({ stage, ...base, ...metadata }));
};
