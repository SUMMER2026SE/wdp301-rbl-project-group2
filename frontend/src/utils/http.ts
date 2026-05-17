/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

export const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_API,
  timeout: 10000,
  withCredentials: true,
});

// ============================
// ------ TYPES ---------------
// ============================

// Cấu trúc API refresh-token trả về
interface RefreshTokenResponse {
  status: string;
  data: {
    access_token: string;
    refresh_token: string;
  };
}

// Request bị queue lại khi đang refresh token
interface FailedQueueItem {
  resolve: () => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

// ============================
// --- QUEUE HANDLER ----------
// ============================

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

// ============================
// --- REFRESH TOKEN API ------
// ============================

const refreshToken = async (): Promise<void> => {
  try {
    console.log("refresh token");

    const result = await axios.post<RefreshTokenResponse>(
      `${import.meta.env.VITE_BASE_API}/auth/refresh`,
      {},
      { withCredentials: true },
    );

    console.log("RESULT:", result);

    if ((result.data as any).success !== true) {
      console.log("Refresh token failed");
      throw new Error("Refresh token failed");
    }

    processQueue(null);
  } catch (error: any) {
    // If refresh token request returns 401, force logout
    processQueue(error);
    throw error;
  }
};

// ============================
// --- GET NEW TOKEN ----------
// ============================

const getNewToken = async (): Promise<void> => {
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      await refreshToken();
    } finally {
      isRefreshing = false;
    }
    return;
  }

  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  });
};

// ============================
// --- REQUEST INTERCEPTOR ----
// ============================

httpClient.interceptors.request.use((config: any) => {
  return config;
});

// ============================
// --- RESPONSE INTERCEPTOR ---
// ============================

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any & {
      _retry?: boolean;
    };

    // If no config, just reject
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const shouldRenewToken =
      error.response?.status === 401 && !originalRequest._retry;

    console.log(
      "shouldRenewToken:",
      shouldRenewToken,
      "url:",
      originalRequest?.url,
    );

    if (shouldRenewToken) {
      originalRequest._retry = true;

      try {
        await getNewToken();
        return httpClient(originalRequest);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  },
);

// ============================
// ---- HTTP METHODS ----------
// ============================

type TMethod = "get" | "post" | "put" | "delete" | "patch";

const _send = async <T>(
  method: TMethod,
  pathname: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const response = await httpClient.request<T>({
    method,
    url: pathname,
    data,
    ...config,
  });

  return response.data;
};

const get = <T>(pathname: string, config?: AxiosRequestConfig) =>
  _send<T>("get", pathname, null, config);

const post = <T>(
  pathname: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) => _send<T>("post", pathname, data, config);

const put = <T>(
  pathname: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) => _send<T>("put", pathname, data, config);

const del = <T>(pathname: string, config?: AxiosRequestConfig) =>
  _send<T>("delete", pathname, null, config);

const patch = <T>(
  pathname: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) => _send<T>("patch", pathname, data, config);

const http = { get, post, put, del, patch };

export default http;
