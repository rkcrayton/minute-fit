
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000"; // Android emulator
  }

  return "http://localhost:8000"; // iOS simulator
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't attempt refresh on the refresh endpoint itself
    if (originalRequest.url?.includes("/users/token")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (!refreshToken) throw new Error("No refresh token");

      const res = await api.post("/users/token/refresh", { refresh_token: refreshToken });
      const { access_token, refresh_token: newRefreshToken } = res.data;

      await SecureStore.setItemAsync("token", access_token);
      await SecureStore.setItemAsync("refresh_token", newRefreshToken);

      processQueue(null, access_token);
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return api(originalRequest);
    } catch (err) {
      processQueue(err, null);
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("refresh_token");
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
