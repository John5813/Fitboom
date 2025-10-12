import WelcomeScreen from "@/components/WelcomeScreen";
import { useLocation } from "wouter";

export default function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <WelcomeScreen onStart={() => setLocation('/register')} />
  );
}
