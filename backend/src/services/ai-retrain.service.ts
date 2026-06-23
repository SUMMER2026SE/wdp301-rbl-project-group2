import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8001';
const AI_RETRAIN_TOKEN = process.env.AI_RETRAIN_TOKEN;

const autoRetrainEnabled = () => /^true|1$/i.test(String(process.env.AI_AUTO_RETRAIN_ON_ORDER_COMPLETED ?? ''));

const minIntervalMs = () => {
  const n = Number(process.env.AI_RETRAIN_MIN_INTERVAL_MS);
  return Number.isFinite(n) && n > 0 ? n : 3_600_000;
};

let lastTriggeredAt = 0;

/**
 * Best-effort: asks AI_FOA to retrain LightFM from MongoDB (debounced).
 * Enable with AI_AUTO_RETRAIN_ON_ORDER_COMPLETED=true and ensure the microservice is reachable.
 */
export function scheduleAiModelRetrain(reason: string): void {
  if (!autoRetrainEnabled()) return;

  const now = Date.now();
  if (now - lastTriggeredAt < minIntervalMs()) return;
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
