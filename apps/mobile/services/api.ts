
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const getBaseURL = () => {
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

export default api;