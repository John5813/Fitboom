import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import RegisterPage from "./RegisterPage";

export default function LoginPage({ fromTelegram = false }: { fromTelegram?: boolean }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.profileCompleted) {
      const lastRole = localStorage.getItem("lastUserRole");
      if (user?.isAdmin && lastRole === "admin") {
        setLocation('/admin');
      } else if (localStorage.getItem("gymOwnerId")) {
        setLocation('/gym-owner');
      } else {
        setLocation('/home');
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  return <RegisterPage />;
}
