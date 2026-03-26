import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getUser,
  logoutApi,
  verifySmsCode,
  verifyTelegramCode,
  setTokens,
  clearTokens,
  getAccessToken,
} from "@/services/api";
import { router } from "expo-router";

interface User {
  id: string;
  phone?: string;
  name?: string | null;
  age?: number;
  gender?: string;
  profileImageUrl?: string;
  credits: number;
  creditExpiryDate?: string;
  isAdmin?: boolean;
  profileCompleted: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<{ isNewUser: boolean }>;
  verifyTelegram: (code: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  login: (payload: { phone?: string; code?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refetchUser: async () => {},
  verifyOtp: async () => ({ isNewUser: false }),
  verifyTelegram: async () => ({ isNewUser: false }),
  logout: async () => {},
  login: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionExpiredHandled = useRef(false);

  const fetchUser = useCallback(async () => {
    try {
      const data = await getUser();
      const u = data?.user ?? (data as any);
      if (u?.id) {
        setUser(u as User);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      if (err?.message === "SESSION_EXPIRED") {
        if (!sessionExpiredHandled.current) {
          sessionExpiredHandled.current = true;
          await clearTokens();
          setUser(null);
          router.replace("/auth" as any);
        }
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    sessionExpiredHandled.current = false;
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const verifyOtp = async (phone: string, code: string): Promise<{ isNewUser: boolean }> => {
    setIsLoading(true);
    try {
      const data = await verifySmsCode(phone, code);
      await setTokens(data.accessToken, data.refreshToken);
      sessionExpiredHandled.current = false;
      const u = data.user;
      setUser({
        id: u.id,
        phone: u.phone,
        name: u.name,
        credits: u.credits ?? 0,
        profileCompleted: u.profileCompleted ?? false,
        isAdmin: (u as any).isAdmin ?? false,
      });
      return { isNewUser: data.isNewUser };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTelegram = async (code: string): Promise<{ isNewUser: boolean }> => {
    setIsLoading(true);
    try {
      const data = await verifyTelegramCode(code);
      await setTokens(data.accessToken, data.refreshToken);
      sessionExpiredHandled.current = false;
      const u = data.user;
      setUser({
        id: u.id,
        phone: u.phone,
        name: u.name,
        credits: u.credits ?? 0,
        profileCompleted: u.profileCompleted ?? false,
        isAdmin: (u as any).isAdmin ?? false,
      });
      return { isNewUser: data.isNewUser };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (payload: { phone?: string; code?: string }) => {
    if (payload.phone && payload.code) {
      const { isNewUser } = await verifyOtp(payload.phone, payload.code);
      if (isNewUser) {
        router.replace("/complete-profile" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {}
    setUser(null);
    await clearTokens();
    await AsyncStorage.removeItem("gymOwnerId");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refetchUser: fetchUser,
        verifyOtp,
        verifyTelegram,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
