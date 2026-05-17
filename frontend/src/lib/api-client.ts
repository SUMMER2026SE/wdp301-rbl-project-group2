import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BASE_API;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // IMPORTANT: send cookies with every request (httpOnly auth cookies)
  withCredentials: true,
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = (originalRequest?.url as string | undefined) ?? "";
    const isAuthMe = url.includes("/auth/me");
    const isAuthRefresh = url.includes("/auth/refresh");
    const isOnLoginPage = window.location?.pathname === "/login";

    // If 401 and not already retrying, try to refresh token
    // Avoid infinite loops for /auth/me and /auth/refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthMe &&
      !isAuthRefresh
    ) {
      originalRequest._retry = true;
      try {
        await apiClient.post("/auth/refresh");
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — redirect to login (but don't loop if already there)
        if (!isOnLoginPage) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
