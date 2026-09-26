import WelcomeScreen from "@/components/WelcomeScreen";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  const handleStart = () => {
    if (isAuthenticated) {
      const lastRole = localStorage.getItem("lastUserRole");
      if (user?.isAdmin && lastRole === "admin") {
        setLocation('/admin');
      } else if (localStorage.getItem("gymOwnerId")) {
        setLocation('/gym-owner');
      } else {
        setLocation('/home');
      }
    } else {
      setLocation('/register');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080d]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d9a751] mx-auto mb-4"></div>
          <p className="text-white/50">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <WelcomeScreen onStart={handleStart} />
  );
}
