import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dumbbell } from "lucide-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      return apiRequest('/api/register', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Xush kelibsiz!",
        description: "Ro'yxatdan o'tish muvaffaqiyatli!",
      });
      setLocation("/home");
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Ro'yxatdan o'tishda xatolik",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !confirmPassword) {
      toast({
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Xatolik",
        description: "Parollar mos kelmadi",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Xatolik",
        description: "Parol kamida 6 belgidan iborat bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md" data-testid="card-register">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-500 text-white p-4 rounded-full">
              <Dumbbell size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-title">Ro'yxatdan o'tish</CardTitle>
          <CardDescription data-testid="text-description">
            Yangi hisob yaratish
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Foydalanuvchi nomi</Label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Parolni tasdiqlang</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Ro'yxatdan o'tish..." : "Ro'yxatdan o'tish"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Allaqachon hisobingiz bormi?{" "}
              </span>
              <button
                type="button"
                className="p-0 h-auto text-orange-500 hover:text-orange-600 underline bg-transparent border-none cursor-pointer"
                onClick={() => setLocation("/login")}
                data-testid="link-login"
              >
                Kirish
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
