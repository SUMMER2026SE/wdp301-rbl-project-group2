import { create } from "zustand";
import {
  disconnectSupportSocket,
  reconnectSupportSocket,
} from "@/lib/support-socket";
import { removeToken } from "@/utils/storage";

// ---- Types (aligned with BE) ----

export type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER";
export type ApiUserRole = UserRole | Lowercase<UserRole>;

export interface AuthAddress {
  label?: string;
  receiverName: string;
  phone: string;
  detail: string;
  ward: string;
  district?: string;
  city: string;
  isDefault: boolean;
}

export interface AuthUser {
  _id: string;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: ApiUserRole;
  isActive: boolean;
  isHealthSetup?: boolean;
  verifiedAt: string | null;
  collectedPoints: number;
  addresses: AuthAddress[]; // Delivery addresses — aligned with BE IUser
  preferences?: {
    dietary: string[];
    allergies: string[];
    healthGoals: string[];
  };
  receiveCampaignNotifications?: boolean;
  storeId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  /** True once auth state has been hydrated from localStorage */
  hydrated: boolean;

  // Actions
  login: (user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  getUser: () => Promise<void>;
  hydrate: () => void;
}

// ---- Helpers ----

const STORAGE_KEY = "foodiedash_user";

function normalizeRole(role: ApiUserRole): UserRole {
  return role.toUpperCase() as UserRole;
}

function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, role: normalizeRole(user.role) };
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: AuthUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeUser(user)));
}

function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---- Store ----

/**
 * Cookie-based auth store.
 * Tokens are managed by httpOnly cookies (set by BE).
 * We only store user info in localStorage for quick hydration.
 */
// Hydrate synchronously on module load so guards never see stale state
const _initialUser = getStoredUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: _initialUser,
  isAuthenticated: !!_initialUser,
  role: _initialUser ? normalizeRole(_initialUser.role) : null,
  hydrated: true, // Already hydrated synchronously above

  login: (user) => {
    reconnectSupportSocket();
    const normalizedUser = normalizeUser(user);
    setStoredUser(normalizedUser);
    // Reset location alert state so it shows after login
    localStorage.removeItem("location_alert_dismissed");
    set({
      user: normalizedUser,
      isAuthenticated: true,
      role: normalizeRole(user.role),
    });
  },

  logout: () => {
    disconnectSupportSocket();
    clearStoredUser();
    removeToken();
    set({
      user: null,
      isAuthenticated: false,
      role: null,
    });
  },

  setUser: (user) => {
    const normalizedUser = normalizeUser(user);
    setStoredUser(normalizedUser);
    set({ user: normalizedUser, role: normalizeRole(user.role) });
  },

  getUser: async () => {
    try {
      // Import dynamically or pass standard way to avoid circular deps
      // Assuming your authService has getCurrentUser() mapped exactly
      const { default: authService } = await import("@/services/auth.service");
      const res = await authService.getCurrentUser();
      if (res.data) {
        const user = normalizeUser(res.data);
        setStoredUser(user);
        set({ user, role: normalizeRole(user.role) });
        reconnectSupportSocket();
      }
    } catch (error) {
      // If cookie session is invalid/expired, clear local auth to avoid mismatch
      console.error("Failed to update user context:", error);
      clearStoredUser();
      set({
        user: null,
        isAuthenticated: false,
        role: null,
      });
    }
  },

  /**
   * Call once on app init to restore auth state from localStorage.
   * Token is in httpOnly cookie, so we only restore user info.
   */
  hydrate: () => {
    const user = getStoredUser();
    if (user) {
      set({
        user,
        isAuthenticated: true,
        role: normalizeRole(user.role),
      });
    }
  },
}));
