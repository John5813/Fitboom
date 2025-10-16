import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dumbbell } from "lucide-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  
  // Step 1 state
  const [phone, setPhone] = useState("");
  
  // Step 2 state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Erkak" | "Ayol" | "">("");
  
  const { toast } = useToast();

  // Telefon raqamini tekshirish uchun mutation
  const checkPhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest('/api/login', 'POST', { phone });
      return response.json();
    },
    onSuccess: async (data) => {
      // Agar foydalanuvchi topilsa, to'g'ridan-to'g'ri tizimga kiritish
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Xush kelibsiz!",
        description: "Tizimga muvaffaqiyatli kirdingiz",
      });
      setTimeout(() => {
        setLocation("/home");
      }, 100);
    },
    onError: () => {
      // Agar foydalanuvchi topilmasa, 2-qadamga o'tish
      setStep(2);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string; age: number; gender: "Erkak" | "Ayol" }) => {
      const response = await apiRequest('/api/register', 'POST', data);
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Xush kelibsiz!",
        description: "Ro'yxatdan o'tish muvaffaqiyatli!",
      });
      setTimeout(() => {
        setLocation("/home");
      }, 100);
    },
    onError: (error: any) => {
      console.error('Register error:', error);
      toast({
        title: "Xatolik",
        description: error.message || "Ro'yxatdan o'tishda xatolik yuz berdi",
        variant: "destructive",
      });
    },
  });

  const handleStep1Submit = (e: React.FormEvent) => {
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

    // Avval foydalanuvchi mavjudligini tekshirish
    checkPhoneMutation.mutate(phone.trim());
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !age || !gender) {
      toast({
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring",
        variant: "destructive",
      });
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      toast({
        title: "Xatolik",
        description: "Yosh 10 dan 100 gacha bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({ phone, name, age: ageNum, gender });
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
          <CardTitle className="text-2xl font-bold" data-testid="text-title">
            {step === 1 ? "Ro'yxatdan o'tish" : "Shaxsiy ma'lumotlar"}
          </CardTitle>
          <CardDescription data-testid="text-description">
            {step === 1 ? "Telefon raqamingizni kiriting" : "Ma'lumotlaringizni to'ldiring"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
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
                disabled={checkPhoneMutation.isPending}
                data-testid="button-next"
              >
                {checkPhoneMutation.isPending ? "Tekshirilmoqda..." : "Keyingi"}
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
          ) : (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ism</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="To'liq ismingiz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Yosh</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="18"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  data-testid="input-age"
                  min="10"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Jins</Label>
                <Select value={gender} onValueChange={(value) => setGender(value as "Erkak" | "Ayol")}>
                  <SelectTrigger id="gender" data-testid="select-gender">
                    <SelectValue placeholder="Jinsni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Erkak" data-testid="option-male">Erkak</SelectItem>
                    <SelectItem value="Ayol" data-testid="option-female">Ayol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  data-testid="button-back"
                >
                  Orqaga
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Ro'yxatdan o'tish..." : "Ro'yxatdan o'tish"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
