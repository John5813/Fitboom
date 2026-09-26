import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ACCESS_PASS_STORAGE_KEY } from "@shared/accessPass";

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
  creditExpiryDate?: string | null;
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
  const [tokenLoginDone, setTokenLoginDone] = useState(false);

  // Mobil ilova WebView dan ?token= bilan kelganda avtomatik login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) { setTokenLoginDone(true); return; }

    fetch("/api/auth/token-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then(() => {
        // URL dan token parametrini olib tashlash (xavfsizlik uchun)
        params.delete("token");
        const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
        window.history.replaceState({}, "", newUrl);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      })
      .catch(() => {})
      .finally(() => setTokenLoginDone(true));
  }, []);

  const { data, isPending } = useQuery<{ user: User } | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn<{ user: User } | null>({ on401: "returnNull" }),
    retry: false,
    enabled: tokenLoginDone,
  });

  /*
   * `isLoading` emas, `isPending`: TanStack Query v5 da o'chirilgan
   * (`enabled: false`) so'rovning `isLoading` qiymati false bo'ladi. Birinchi
   * renderda token tekshiruvi hali tugamagan va so'rov o'chiq — ilgari bu
   * "yuklanmayapti va foydalanuvchi yo'q" deb o'qilardi, ProtectedRoute darhol
   * /login ga, u yerdan /home ga otardi. Natijada /profile, /courses,
   * /settings va /admin sahifalari yangilanganda (yoki havola orqali
   * ochilganda) bosh sahifaga tushib qolardi.
   */
  const isLoading = !tokenLoginDone || isPending;

  const user = data?.user || null;
  const isAuthenticated = !!user;

  const logout = async () => {
    // Kirish ruxsatnomasi keyingi foydalanuvchiga ko'rinmasin
    try {
      localStorage.removeItem(ACCESS_PASS_STORAGE_KEY);
    } catch {
      /* saqlash imkoni yo'q */
    }
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

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Yuklanmoqda...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}

/**
 * Admin sahifalari uchun.
 *
 * Bu faqat UI darajasidagi to'siq — haqiqiy nazorat serverdagi requireAdmin
 * middleware'ida. Lekin ilgari admin sahifalari oddiy ProtectedRoute ostida edi,
 * ya'ni istalgan foydalanuvchi panelni ochib, ichidagi ma'lumot so'rovlarini
 * yuborardi. Endi admin bo'lmagan foydalanuvchi bosh sahifaga qaytariladi.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (!user?.isAdmin) {
      setLocation("/home");
    }
  }, [user, isAuthenticated, isLoading, setLocation]);

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated || !user?.isAdmin) return null;

  return <>{children}</>;
}