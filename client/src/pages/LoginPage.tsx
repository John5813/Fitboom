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

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { phone: string }) => {
      const response = await apiRequest('/api/login', 'POST', data);
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Xush kelibsiz!",
        description: "Tizimga muvaffaqiyatli kirdingiz.",
      });
      setTimeout(() => {
        setLocation("/home");
      }, 100);
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      toast({
        title: "Xatolik",
        description: error.message || "Telefon raqami topilmadi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast({
        title: "Xatolik",
        description: "Telefon raqamini kiriting",
        variant: "destructive",
      });
      return;
    }

    // Validate phone format
    const phoneRegex = /^\+998\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Xatolik",
        description: "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ phone });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md" data-testid="card-login">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-500 text-white p-4 rounded-full">
              <Dumbbell size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-title">Tizimga kirish</CardTitle>
          <CardDescription data-testid="text-description">
            FitBoom ilovasiga xush kelibsiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqami</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+998XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="input-phone"
                autoComplete="tel"
              />
              <p className="text-sm text-gray-500">Format: +998XXXXXXXXX</p>
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Kirish..." : "Kirish"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Hali ro'yxatdan o'tmaganmisiz?{" "}
              </span>
              <button
                type="button"
                className="p-0 h-auto text-orange-500 hover:text-orange-600 underline bg-transparent border-none cursor-pointer"
                onClick={() => setLocation("/register")}
                data-testid="link-register"
              >
                Ro'yxatdan o'tish
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
