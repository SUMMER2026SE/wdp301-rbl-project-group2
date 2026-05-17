import { useAuthStore } from "../store/authStore";
import type { AuthUser } from "../store/authStore";

/**
 * Hook wrapper for Zustand auth store.
 * Cookie-based auth — no token stored in FE.
 *
 * Usage:
 * ```tsx
 * const { user, isAuthenticated, login, logout, role } = useAuth();
 * ```
 */
export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const getUser = useAuthStore((s) => s.getUser);
  const hydrate = useAuthStore((s) => s.hydrate);

  const isAdmin = role === "ADMIN";
  const isStaff = role === "STAFF";
  const isCustomer = role === "CUSTOMER";

  return {
    user,
    isAuthenticated,
    role,
    isAdmin,
    isStaff,
    isCustomer,
    login,
    logout,
    setUser,
    getUser,
    hydrate,
  };
};

export type { AuthUser };
