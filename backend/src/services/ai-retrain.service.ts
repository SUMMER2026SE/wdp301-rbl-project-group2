import axios from 'axios';
import {
  AI_AUTO_RETRAIN_ON_ORDER_COMPLETED,
  AI_MICROSERVICE_URL,
  AI_RETRAIN_MIN_INTERVAL_MS,
  AI_RETRAIN_TOKEN,
} from '@/constants/env';

let lastTriggeredAt = 0;

/**
 * Best-effort: asks AI_FOA to retrain LightFM from MongoDB (debounced).
 * Enable with AI_AUTO_RETRAIN_ON_ORDER_COMPLETED=true and ensure the microservice is reachable.
 */
export function scheduleAiModelRetrain(reason: string): void {
  if (!AI_AUTO_RETRAIN_ON_ORDER_COMPLETED) return;

  const now = Date.now();
  if (now - lastTriggeredAt < AI_RETRAIN_MIN_INTERVAL_MS) return;
  lastTriggeredAt = now;

  axios
    .post(
      `${AI_MICROSERVICE_URL}/recommend/retrain`,
      {},
      {
        timeout: 5000,
        headers: AI_RETRAIN_TOKEN ? { 'X-AI-Retrain-Token': AI_RETRAIN_TOKEN } : undefined,
      }
    )
    .then(() => console.log(`[AI] Retrain triggered (${reason})`))
    .catch((err) => console.warn(`[AI] Retrain request failed (${reason}):`, err?.message ?? err));
}
