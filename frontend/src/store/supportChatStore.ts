import { create } from "zustand";

interface SupportChatState {
  isOpen: boolean;
  isMounted: boolean;
  orderId: string | undefined;
  
  // Actions
  openChat: (orderId?: string) => void;
  closeChat: () => void;
  minimizeChat: () => void;
  mountChat: (orderId?: string) => void;
}

export const useSupportChatStore = create<SupportChatState>((set) => ({
  isOpen: false,
  isMounted: false,
  orderId: undefined,

  openChat: (orderId) => set({ isOpen: true, isMounted: true, orderId: orderId !== undefined ? orderId : undefined }),
  closeChat: () => set({ isOpen: false, isMounted: false, orderId: undefined }),
  minimizeChat: () => set({ isOpen: false }),
  mountChat: (orderId) => set({ isMounted: true, orderId: orderId !== undefined ? orderId : undefined }),
}));
