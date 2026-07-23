import { Queue, Worker, Job } from 'bullmq';
import UserModel from '@/models/user.model';
import { redisConfig } from '@/config/redis';
import { extractPreferencesFromMessage } from '@/services/chatbot.service';

interface ChatPreferenceJobData {
  userId: string;
  messageId: string;
  message: string;
}

export const chatPreferenceQueue = new Queue<ChatPreferenceJobData>('chat-preference-extraction-queue', {
  connection: redisConfig,
});

export const enqueueChatPreferenceExtraction = async (data: ChatPreferenceJobData) => {
  await chatPreferenceQueue.add(`taste-${data.userId}-${data.messageId}`, data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  });
};

export const startChatPreferenceWorker = () => {
  const worker = new Worker(
    'chat-preference-extraction-queue',
    async (job: Job<ChatPreferenceJobData>) => {
      const { userId, message } = job.data;
      const newTastes = await extractPreferencesFromMessage(message);
      if (!newTastes.length) return { updated: false };

      const user = await UserModel.findById(userId);
      if (!user) return { updated: false };

      if (!user.preferences) {
        user.preferences = { dietary: [], allergies: [], healthGoals: [], tastes: [] };
      }

      const currentTastes = user.preferences.tastes || [];
      const updatedTastes = [...new Set([...currentTastes, ...newTastes])];

      if (updatedTastes.length === currentTastes.length) {
        return { updated: false };
      }

      user.preferences.tastes = updatedTastes;
      await user.save();
      return { updated: true, tasteCount: updatedTastes.length };
    },
    {
      connection: redisConfig,
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[ChatPreferenceWorker] Job #${job?.id} thất bại:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Redis Error] chatPreference worker connection failed:', err.message);
  });
};

chatPreferenceQueue.on('error', (err) => {
  console.error('[Redis Error] chatPreferenceQueue connection failed:', err.message);
});
