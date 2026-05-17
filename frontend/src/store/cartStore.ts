import { create } from 'zustand';

// ---- Types ----

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  variations?: { name: string; choice: string }[];
  extras?: { id: string; name: string; price: number }[];
  note?: string;
  selected?: boolean;
}

interface CartState {
  items: CartItem[];
  orderNote: string;

  // Computed
  totalItems: number;
  totalPrice: number;
  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  toggleSelectItem: (key: string) => void;
  toggleSelectAll: (selected: boolean) => void;
  setOrderNote: (note: string) => void;
  clearOrderNote: () => void;

  clearCart: () => void;
  hydrate: () => void;
  mergeGuestCartIntoCurrentUser: () => void;
}

// ---- Storage ----

// Lưu cart theo từng user (hoặc guest) dựa theo auth store trong localStorage
const BASE_CART_KEY = "foodie_cart";
const BASE_NOTE_KEY = "foodie_cart_note";
const AUTH_STORAGE_KEY = "foodiedash_user";
const GUEST_CART_KEY = `${BASE_CART_KEY}_guest`;

const getUserScopedKeys = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return {
        cartKey: `${BASE_CART_KEY}_guest`,
        noteKey: `${BASE_NOTE_KEY}_guest`,
      };
    }
    const user = JSON.parse(raw) as { _id?: string };
    const userId = user?._id || "guest";
    return {
      cartKey: `${BASE_CART_KEY}_${userId}`,
      noteKey: `${BASE_NOTE_KEY}_${userId}`,
    };
  } catch {
    return {
      cartKey: `${BASE_CART_KEY}_guest`,
      noteKey: `${BASE_NOTE_KEY}_guest`,
    };
  }
};

const saveCart = (items: CartItem[]) => {
  const { cartKey } = getUserScopedKeys();
  localStorage.setItem(cartKey, JSON.stringify(items));
};

const loadCart = (): CartItem[] => {
  const { cartKey } = getUserScopedKeys();
  const raw = localStorage.getItem(cartKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
};

const saveNote = (note: string) => {
  const { noteKey } = getUserScopedKeys();
  localStorage.setItem(noteKey, note);
};

const loadNote = () => {
  const { noteKey } = getUserScopedKeys();
  return localStorage.getItem(noteKey) ?? "";
};

const mergeItems = (base: CartItem[], incoming: CartItem[]): CartItem[] => {
  const result = [...base];
  for (const item of incoming) {
    const key = itemKey(item);
    const idx = result.findIndex((i) => itemKey(i) === key);
    if (idx >= 0) {
      result[idx] = { ...result[idx], quantity: result[idx].quantity + item.quantity };
    } else {
      result.push(item);
    }
  }
  return result;
};

// ---- Helpers ----

const computeTotals = (items: CartItem[]) => {
  const selectedItems = items.filter(i => i.selected !== false);
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: selectedItems.reduce((sum, i) => {
      const extrasPrice = i.extras?.reduce((s, e) => s + e.price, 0) || 0;
      return sum + (i.price + extrasPrice) * i.quantity;
    }, 0),
  };
};

const normalizeVariations = (vars?: { name: string; choice: string }[]) =>
  (vars ?? [])
    .map((v) => ({ name: v.name.trim(), choice: v.choice.trim() }))
    .sort((a, b) => (a.name + a.choice).localeCompare(b.name + b.choice));

const normalizeExtras = (
  extras?: { id: string; name: string; price: number }[],
) =>
  (extras ?? [])
    .map((e) => ({
      id: String(e.id),
      name: e.name,
      price: Number(e.price ?? 0),
    }))
    .sort((a, b) => (a.id + a.name).localeCompare(b.id + b.name));

export const itemKey = (i: CartItem) =>
  JSON.stringify({
    productId: i.productId,
    size: i.size ?? "",
    variations: normalizeVariations(i.variations),
    extras: normalizeExtras(i.extras),
    note: (i.note ?? "").trim(),
  });
// ---- Store ----

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderNote: "",
  totalItems: 0,
  totalPrice: 0,

  addItem: (item) => {
    const items = get().items;
    const incomingKey = itemKey(item);
    const existingIndex = items.findIndex((i) => itemKey(i) === incomingKey);

    let newItems: CartItem[];
    if (existingIndex >= 0) {
      // Merge quantities
      newItems = items.map((i, idx) =>
        idx === existingIndex
          ? { ...i, quantity: i.quantity + item.quantity }
          : i,
      );
    } else {
      newItems = [...items, item];
    }

    saveCart(newItems);
    set({ items: newItems, ...computeTotals(newItems) });
  },

  removeItem: (key) => {
    const newItems = get().items.filter((i) => itemKey(i) !== key);
    saveCart(newItems);
    set({ items: newItems, ...computeTotals(newItems) });
  },

  updateQuantity: (key, quantity) => {
    if (quantity <= 0) {
      get().removeItem(key);
      return;
    }
    const newItems = get().items.map((i) =>
      itemKey(i) === key ? { ...i, quantity } : i
    );
    saveCart(newItems);
    set({ items: newItems, ...computeTotals(newItems) });
  },

  toggleSelectItem: (key) => {
    const newItems = get().items.map((i) =>
      itemKey(i) === key ? { ...i, selected: i.selected === false } : i
    );
    saveCart(newItems);
    set({ items: newItems, ...computeTotals(newItems) });
  },

  toggleSelectAll: (selected) => {
    const newItems = get().items.map((i) => ({ ...i, selected }));
    saveCart(newItems);
    set({ items: newItems, ...computeTotals(newItems) });
  },

  // NEW
  setOrderNote: (note) => {
    const normalized = (note ?? "").slice(0, 500);
    saveNote(normalized);
    set({ orderNote: normalized });
  },

  // NEW
  clearOrderNote: () => {
    const { noteKey } = getUserScopedKeys();
    localStorage.removeItem(noteKey);
    set({ orderNote: "" });
  },

  clearCart: () => {
    const { cartKey, noteKey } = getUserScopedKeys();
    localStorage.removeItem(cartKey);
    localStorage.removeItem(noteKey);
    set({ items: [], orderNote: "", totalItems: 0, totalPrice: 0 });
  },

  hydrate: () => {
    const items = loadCart();
    const orderNote = loadNote();
    set({ items, orderNote, ...computeTotals(items) });
  },

  mergeGuestCartIntoCurrentUser: () => {
    const { cartKey } = getUserScopedKeys();

    const guestRaw = localStorage.getItem(GUEST_CART_KEY);
    if (!guestRaw) return;

    let guestItems: CartItem[] = [];
    try {
      guestItems = JSON.parse(guestRaw) as CartItem[];
    } catch {
      guestItems = [];
    }

    const currentRaw = localStorage.getItem(cartKey);
    let currentItems: CartItem[] = [];
    if (currentRaw) {
      try {
        currentItems = JSON.parse(currentRaw) as CartItem[];
      } catch {
        currentItems = [];
      }
    }

    const merged = mergeItems(currentItems, guestItems);
    localStorage.setItem(cartKey, JSON.stringify(merged));
    localStorage.removeItem(GUEST_CART_KEY);
    set({ items: merged, ...computeTotals(merged) });
  },
}));
