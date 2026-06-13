import axios from "axios";

import { useAuthStore } from "../features/auth/auth-store";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true, // Gửi/nhận cookie HttpOnly (refreshToken) từ API server
});

// Request Interceptor: Gán Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Tự động refresh token khi gặp lỗi 401 Unauthorized
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/refresh`,
      { refreshToken },
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      },
    );

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = response.data;

    useAuthStore
      .getState()
      .setAuth(accessToken, newRefreshToken || refreshToken || "", user);

    apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    processQueue(null, accessToken);

    return accessToken;
  } catch (refreshError) {
    processQueue(refreshError, null);
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        if (originalRequest.headers.set) {
          originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        } else {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
