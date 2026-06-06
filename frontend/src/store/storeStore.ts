import { create } from 'zustand';
import { getStores, type IStore } from '@/services/store.service';

interface StoreState {
  selectedStore: IStore | null;
  stores: IStore[];
  isLoading: boolean;
  error: string | null;
  fetchStores: () => Promise<void>;
  selectStore: (store: IStore) => void;
  clearSelectedStore: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'foodiedash_selected_store';

export const useStoreStore = create<StoreState>((set, get) => ({
  selectedStore: null,
  stores: [],
  isLoading: false,
  error: null,
  fetchStores: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await getStores();
      set({ stores: data || [], isLoading: false });
    } catch (err: any) {
      set({ 
        error: err.response?.data?.message || err.message || 'Failed to fetch stores', 
        isLoading: false 
      });
    }
  },
  selectStore: (store) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    set({ selectedStore: store });
  },
  clearSelectedStore: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    set({ selectedStore: null });
  },
  hydrate: () => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const store = JSON.parse(raw) as IStore;
        set({ selectedStore: store });
      } catch {
        set({ selectedStore: null });
      }
    }
  }
}));
export type { IStore };
