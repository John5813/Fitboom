import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUser, logoutApi, loginApi, setToken, getToken } from "@/services/api";

interface User {
  id: string;
  phone?: string;
  name?: string;
  age?: number;
  gender?: string;
  profileImageUrl?: string;
  credits: number;
  creditExpiryDate?: string;
  isAdmin: boolean;
  profileCompleted: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => Promise<void>;
  login: (payload: { phone?: string; code?: string; email?: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refetchUser: async () => {},
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await getUser();
      if (data?.user) {
        setUser(data.user);
      } else if (data?.id) {
        setUser(data as unknown as User);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    const cachedToken = await getToken();
    if (!cachedToken) {
      setIsLoading(false);
      return;
    }
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = async (payload: { phone?: string; code?: string; email?: string; password?: string }) => {
    setIsLoading(true);
    try {
      const data = await loginApi(payload);
      if (!data?.token) {
        throw new Error("Login API did not return token.");
      }
      await setToken(data.token);
      await fetchUser();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore network/logout errors in UI
    }
    setUser(null);
    await setToken(null);
    await AsyncStorage.removeItem("gymOwnerId");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refetchUser: fetchUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
