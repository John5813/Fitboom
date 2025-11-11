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
  const [checkingAuth, setCheckingAuth] = useState(false);
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

  const { data: telegramAuthUrl } = useQuery({
    queryKey: ['/api/telegram/auth-url'],
  });

  const checkAuthMutation = useMutation({
    mutationFn: async () => {
      const telegramId = localStorage.getItem('telegram_user_id');
      if (!telegramId) {
        throw new Error('Telegram ID topilmadi');
      }
      const response = await apiRequest('/api/telegram/check-auth', 'POST', { telegramId });
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
          setShowProfileDialog(true);
        }
      } else {
        toast({
          title: "Xatolik",
          description: "Siz hali ro'yxatdan o'tmagansiz. Telegram botga o'ting va /start bosing.",
          variant: "destructive",
        });
      }
      setCheckingAuth(false);
    },
    onError: (error: any) => {
      console.error('Check auth error:', error);
      toast({
        title: "Xatolik",
        description: error.message || "Tizimga kirish amalga oshmadi",
        variant: "destructive",
      });
      setCheckingAuth(false);
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

  const handleTelegramAuth = () => {
    if (telegramAuthUrl && typeof telegramAuthUrl === 'object' && 'url' in telegramAuthUrl) {
      window.open((telegramAuthUrl as any).url, '_blank');
      setCheckingAuth(true);
      
      const checkInterval = setInterval(async () => {
        const telegramId = localStorage.getItem('telegram_user_id');
        if (telegramId) {
          clearInterval(checkInterval);
          checkAuthMutation.mutate();
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (checkingAuth) {
          setCheckingAuth(false);
        }
      }, 60000);
    }
  };

  const onSubmit = (data: CompleteProfileFormData) => {
    completeProfileMutation.mutate(data);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'telegram_auth') {
        localStorage.setItem('telegram_user_id', event.data.userId);
        checkAuthMutation.mutate();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
          <div className="space-y-4">
            <Button
              onClick={handleTelegramAuth}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              disabled={checkingAuth || !telegramAuthUrl}
              data-testid="button-telegram-auth"
            >
              <Send className="mr-2 h-5 w-5" />
              {checkingAuth ? "Telegram-dan javob kutilmoqda..." : "Telegram orqali kirish"}
            </Button>
            
            {checkingAuth && (
              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                Telegram botda /start bosing va telefon raqamingizni ulashing
              </p>
            )}
          </div>
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
