import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  phone: string | null;
  telegramId?: string | null;
  name: string | null;
  age?: number | null;
  gender?: string | null;
  credits: number;
  isAdmin: boolean;
  profileCompleted: boolean;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  logout: async () => {},
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ user: User } | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn<{ user: User } | null>({ on401: "returnNull" }),
    retry: false,
  });

  const user = data?.user || null;
  const isAuthenticated = !!user;

  const logout = async () => {
    try {
      await apiRequest('/api/logout', 'POST');
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setLocation("/");
    } catch (error) {
      console.error('Logout error:', error);
      setLocation("/");
    }
  };

  const value = {
    user,
    logout,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}