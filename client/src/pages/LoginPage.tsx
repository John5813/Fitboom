import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dumbbell, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const completeProfileSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak"),
  age: z.number().min(10, "Yosh kamida 10 bo'lishi kerak").max(100, "Yosh 100 dan oshmasligi kerak"),
  gender: z.enum(["Erkak", "Ayol"], { errorMap: () => ({ message: "Jinsni tanlang" }) }),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      name: "",
      age: 18,
      gender: undefined,
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.profileCompleted) {
      setLocation('/home');
    } else if (!isLoading && isAuthenticated && !user?.profileCompleted) {
      setShowProfileDialog(true);
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('/api/telegram/verify-code', 'POST', { code });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        await queryClient.refetchQueries({ queryKey: ['/api/user'] });

        if (data.profileCompleted) {
          toast({
            title: "Xush kelibsiz!",
            description: "Tizimga muvaffaqiyatli kirdingiz.",
          });
          setLocation("/home");
        } else {
          setShowCodeInput(false);
          setShowProfileDialog(true);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Kod noto'g'ri yoki muddati o'tgan",
        variant: "destructive",
      });
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfileFormData) => {
      const response = await apiRequest('/api/complete-profile', 'POST', data);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Tabriklaymiz!",
        description: "Profilingiz muvaffaqiyatli to'ldirildi.",
      });
      setShowProfileDialog(false);
      setLocation("/home");
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Profilni to'ldirishda xatolik yuz berdi",
        variant: "destructive",
      });
    },
  });

  const { data: telegramAuthData } = useQuery({
    queryKey: ['/api/telegram/auth-url'],
  });

  const handleTelegramAuth = () => {
    if (telegramAuthData?.url) {
      window.open(telegramAuthData.url, '_blank');
      setShowCodeInput(true);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode || loginCode.length < 6) {
      toast({
        title: "Xatolik",
        description: "Kodni to'liq kiriting",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(loginCode.toUpperCase());
  };

  const onSubmit = (data: CompleteProfileFormData) => {
    completeProfileMutation.mutate(data);
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
          <CardTitle className="text-2xl font-bold" data-testid="text-title">FitBoom ga xush kelibsiz</CardTitle>
          <CardDescription data-testid="text-description">
            Ro'yxatdan o'tish uchun Telegram bot orqali kirish
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showCodeInput ? (
            <div className="space-y-4">
              <Button
                onClick={handleTelegramAuth}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                data-testid="button-telegram-auth"
              >
                <Send className="mr-2 h-5 w-5" />
                Telegram orqali kirish
              </Button>

              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                Telegram botda /start bosing va telefon raqamingizni ulashing
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Telegram botdan kelgan kodni kiriting
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Kirish kodi
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder="XXXXXXXX"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  data-testid="input-login-code"
                  autoFocus
                  className="text-center text-xl font-mono tracking-widest"
                  maxLength={8}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={verifyCodeMutation.isPending}
                data-testid="button-verify-code"
              >
                {verifyCodeMutation.isPending ? "Tekshirilmoqda..." : "Tasdiqlash"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowCodeInput(false)}
                data-testid="button-back"
              >
                Orqaga
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-complete-profile">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Profilni to'ldirish</DialogTitle>
            <DialogDescription>
              Davom etish uchun quyidagi ma'lumotlarni to'ldiring
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ismingiz</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ismingizni kiriting" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yoshingiz</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="Yoshingizni kiriting"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-age"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jinsingiz</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Jinsni tanlang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Erkak">Erkak</SelectItem>
                        <SelectItem value="Ayol">Ayol</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={completeProfileMutation.isPending}
                data-testid="button-complete-profile"
              >
                {completeProfileMutation.isPending ? "Yuklanmoqda..." : "Davom etish"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}