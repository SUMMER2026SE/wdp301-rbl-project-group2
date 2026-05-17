import { create } from 'zustand';
import { getStoreSettings, type ISettings } from '@/services/settings.service';

interface SettingsState {
  settings: ISettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,
  fetchSettings: async () => {
    // Avoid double fetching if already loaded
    if (get().settings) return;

    set({ isLoading: true, error: null });
    try {
      const { data } = await getStoreSettings();
      set({ settings: data, isLoading: false });
    } catch (err: any) {
      set({ 
        error: err.response?.data?.message || 'Failed to fetch settings', 
        isLoading: false 
      });
    }
  },
}));
