import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
  credits: number;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUserAsAdmin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUserAsAdmin: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [localUser, setLocalUser] = useState<User | null>(null);
  
  const { data, isLoading } = useQuery<{ user: User }>({
    queryKey: ['/api/user'],
    retry: false,
  });

  const serverUser = data?.user || null;
  const user = localUser || serverUser;
  const isAuthenticated = !!user;

  const setUserAsAdmin = () => {
    if (serverUser) {
      setLocalUser({
        ...serverUser,
        isAdmin: true,
      });
    }
  };

  useEffect(() => {
    if (serverUser) {
      setLocalUser(serverUser);
    }
  }, [serverUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, setUserAsAdmin }}>
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
