/**
 * Storage Wrapper — Platform-agnostic token storage.
 *
 * On Web  → uses localStorage
 * On App  → swap internals to SecureStore (Expo) without changing the API.
 */

const TOKEN_KEY = 'foodie_access_token';
const REFRESH_TOKEN_KEY = 'foodie_refresh_token';
const USER_KEY = 'foodie_user';

// ---- Token helpers ----

export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

// ---- Refresh Token helpers ----

export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeRefreshToken = (): void => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ---- User helpers ----

export const getStoredUser = <T>(): T | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const setStoredUser = <T>(user: T): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeStoredUser = (): void => {
    localStorage.removeItem(USER_KEY);
};

// ---- Clear all auth data ----

export const clearAuthStorage = (): void => {
    removeToken();
    removeRefreshToken();
    removeStoredUser();
};
