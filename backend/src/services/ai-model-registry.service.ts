import { GEMINI_MODEL, GROQ_CHAT_MODEL, GROQ_INTENT_MODEL, GROQ_SEMANTIC_PLANNER_MODEL } from '@/constants/env';

export type AIModelUseCase = 'chat' | 'intent' | 'semantic_planner' | 'preference_extraction';

export interface AIModelProfile {
  provider: 'groq' | 'gemini';
  modelId: string;
  useCase: AIModelUseCase;
  supportsTools: boolean;
  supportsStrictJson: boolean;
  shutdownAt?: string;
}

const modelProfiles: Record<AIModelUseCase, AIModelProfile> = {
  chat: {
    provider: 'groq',
    modelId: GROQ_CHAT_MODEL,
    useCase: 'chat',
    supportsTools: true,
    supportsStrictJson: true,
  },
  intent: {
    provider: 'groq',
    modelId: GROQ_INTENT_MODEL,
    useCase: 'intent',
    supportsTools: false,
    supportsStrictJson: true,
  },
  semantic_planner: {
    provider: 'groq',
    modelId: GROQ_SEMANTIC_PLANNER_MODEL,
    useCase: 'semantic_planner',
    supportsTools: false,
    supportsStrictJson: true,
  },
  preference_extraction: {
    provider: 'gemini',
    modelId: GEMINI_MODEL,
    useCase: 'preference_extraction',
    supportsTools: false,
    supportsStrictJson: false,
  },
};

export const getAIModelProfile = (useCase: AIModelUseCase) => modelProfiles[useCase];

export const warnIfDeprecatedChatModel = () => {
  if (GROQ_CHAT_MODEL === 'llama-3.1-8b-instant') {
    console.warn(
      '[AIModelRegistry] GROQ_CHAT_MODEL đang dùng llama-3.1-8b-instant, model này đã có lịch deprecation. Hãy chuyển sang model production mới trước khi tăng traffic.'
    );
  }
};
