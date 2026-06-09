import { create } from 'zustand';

interface ConflictData {
  productName: string;
  conflictIngredients: string[];
  warningMessage: string;
  level: 'danger' | 'warning';
}

interface AllergyWarningState {
  isOpen: boolean;
  conflictData: ConflictData | null;
  onConfirmCallback: (() => void) | null;

  openWarning: (data: ConflictData, onConfirm: () => void) => void;
  closeWarning: () => void;
  confirmWarning: () => void;
}

export const useAllergyWarningStore = create<AllergyWarningState>((set, get) => ({
  isOpen: false,
  conflictData: null,
  onConfirmCallback: null,

  openWarning: (data, onConfirm) => {
    set({
      isOpen: true,
      conflictData: data,
      onConfirmCallback: onConfirm,
    });
  },

  closeWarning: () => {
    set({
      isOpen: false,
      conflictData: null,
      onConfirmCallback: null,
    });
  },

  confirmWarning: () => {
    const cb = get().onConfirmCallback;
    if (cb) cb();
    get().closeWarning();
  },
}));
