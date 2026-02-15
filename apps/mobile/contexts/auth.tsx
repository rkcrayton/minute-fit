import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import api from "@/services/api";

// Matches your backend's UserResponse schema
interface User {
  id: number;
  email: string;
  username: string;
  name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  fitness_goal: string | null;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  fitness_goal?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app startup, check if we have a saved token
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await SecureStore.getItemAsync("token");
        if (savedToken) {
          setToken(savedToken);
          // Verify the token is still valid by fetching the user
          const res = await api.get("/users/me", {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          setUser(res.data);
        }
      } catch {
        // Token is expired or invalid — clear it
        await SecureStore.deleteItemAsync("token");
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(username: string, password: string) {
    // The backend expects form data for the token endpoint (OAuth2 spec)
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const tokenRes = await api.post("/users/token", formData.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const newToken = tokenRes.data.access_token;
    await SecureStore.setItemAsync("token", newToken);
    setToken(newToken);

    // Fetch the user profile
    const userRes = await api.get("/users/me", {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    setUser(userRes.data);
  }

  async function register(data: RegisterData) {
    // Create the account
    await api.post("/users/register", data);
    // Auto-login after registration
    await login(data.username, data.password);
  }

  async function logout() {
    await SecureStore.deleteItemAsync("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}