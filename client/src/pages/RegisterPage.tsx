import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Phone, ChevronLeft, Dumbbell } from "lucide-react";
import fitboomLogo from "@/assets/fitboom-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const completeProfileSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak"),
  age: z.number().min(10, "Yosh kamida 10 bo'lishi kerak").max(120, "Yosh 120 dan oshmasligi kerak"),
  gender: z.enum(["Erkak", "Ayol"], { errorMap: () => ({ message: "Jinsni tanlang" }) }),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

type Step = "method" | "telegram-code" | "sms-phone" | "sms-code";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(() => {
    const saved = sessionStorage.getItem("loginStep");
    return (saved as Step) || "method";
  });
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { name: "", age: 18, gender: undefined },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.profileCompleted) {
      const lastRole = localStorage.getItem("lastUserRole");
      if (user?.isAdmin && lastRole === "admin") {
        setLocation('/admin');
      } else if (localStorage.getItem("gymOwnerId") && lastRole === "gymOwner") {
        setLocation('/gym-owner');
      } else {
        setLocation('/home');
      }
    } else if (!isLoading && isAuthenticated && !user?.profileCompleted) {
      setShowProfileDialog(true);
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verifyTelegramMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('/api/telegram/verify-code', 'POST', { code });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        await queryClient.refetchQueries({ queryKey: ['/api/user'] });
        if (data.profileCompleted) {
          sessionStorage.removeItem("loginStep");
          toast({ title: "Xush kelibsiz!", description: "Tizimga muvaffaqiyatli kirdingiz." });
          setLocation("/home");
        } else {
          changeStep("method");
          setShowProfileDialog(true);
        }
      }
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message || "Kod noto'g'ri yoki muddati o'tgan", variant: "destructive" });
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('/api/sms/send', 'POST', { phone: phoneNumber });
      return response.json();
    },
    onSuccess: () => {
      changeStep("sms-code");
      setCountdown(60);
      toast({ title: "SMS yuborildi", description: `${phone} raqamiga tasdiqlash kodi yuborildi` });
    },
    onError: (error: any) => {
      let msg = error.message || "SMS yuborishda xatolik";
      try {
        const raw = error.message || "";
        const idx = raw.indexOf(": ");
        const parsed = JSON.parse(idx >= 0 ? raw.slice(idx + 2) : raw);
        if (parsed?.message) msg = parsed.message;
        if (parsed?.cooldown) setCountdown(parsed.cooldown);
      } catch {}
      toast({ title: "Xatolik", description: msg, variant: "destructive" });
    },
  });

  const verifySmsMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const response = await apiRequest('/api/sms/verify', 'POST', { phone, code });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        await queryClient.refetchQueries({ queryKey: ['/api/user'] });
        if (data.profileCompleted) {
          sessionStorage.removeItem("loginStep");
          toast({ title: "Xush kelibsiz!", description: "Tizimga muvaffaqiyatli kirdingiz." });
          setLocation("/home");
        } else {
          changeStep("method");
          setShowProfileDialog(true);
        }
      }
    },
    onError: (error: any) => {
      let msg = error.message || "Kod noto'g'ri";
      try {
        const raw = error.message || "";
        const idx = raw.indexOf(": ");
        const parsed = JSON.parse(idx >= 0 ? raw.slice(idx + 2) : raw);
        if (parsed?.message) msg = parsed.message;
      } catch {}
      toast({ title: "Xatolik", description: msg, variant: "destructive" });
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfileFormData) => {
      const response = await apiRequest('/api/complete-profile', 'POST', data);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: "Tabriklaymiz!", description: "Profilingiz muvaffaqiyatli to'ldirildi." });
      setShowProfileDialog(false);
      setLocation("/home");
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message || "Profilni to'ldirishda xatolik", variant: "destructive" });
    },
  });

  const changeStep = (s: Step) => {
    if (s === "method") sessionStorage.removeItem("loginStep");
    else sessionStorage.setItem("loginStep", s);
    setStep(s);
  };

  const handleTelegramAuth = () => {
    changeStep("telegram-code");
  };

  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      toast({ title: "Xatolik", description: "Telefon raqamini to'g'ri kiriting", variant: "destructive" });
      return;
    }
    sendSmsMutation.mutate(phone);
  };

  const handleVerifySms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode || smsCode.length < 6) {
      toast({ title: "Xatolik", description: "6 xonali kodni kiriting", variant: "destructive" });
      return;
    }
    verifySmsMutation.mutate({ phone, code: smsCode });
  };

  const handleVerifyTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode || loginCode.length < 6) {
      toast({ title: "Xatolik", description: "Kodni to'liq kiriting", variant: "destructive" });
      return;
    }
    verifyTelegramMutation.mutate(loginCode.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={fitboomLogo}
            alt="FitBoom"
            className="h-28 w-auto mx-auto mb-2 rounded-2xl"
            data-testid="img-logo"
          />
          <p className="text-gray-500 text-sm mt-1">Sport platformasi</p>
        </div>

        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden" data-testid="card-register">
          <CardHeader className="pb-2 pt-6 px-6">
            {step !== "method" && (
              <button
                onClick={() => {
                  if (step === "sms-code") changeStep("sms-phone");
                  else changeStep("method");
                }}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-2 -ml-1"
                data-testid="button-back"
              >
                <ChevronLeft size={18} /> Orqaga
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {step === "method" && "Kirish usulini tanlang"}
              {step === "telegram-code" && "Telegram kodi"}
              {step === "sms-phone" && "Telefon raqamingiz"}
              {step === "sms-code" && "Tasdiqlash kodi"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === "method" && "Quyidagi usullardan birini tanlang"}
              {step === "telegram-code" && "Bot tomonidan yuborilgan kodni kiriting"}
              {step === "sms-phone" && "SMS tasdiqlash kodi yuboriladi"}
              {step === "sms-code" && `${phone} raqamiga yuborilgan kodni kiriting`}
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4">
            {/* Usul tanlash */}
            {step === "method" && (
              <div className="space-y-3">
                <button
                  onClick={handleTelegramAuth}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-200 transition-all text-left"
                  data-testid="button-telegram-auth"
                >
                  <div className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Send className="text-white" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Telegram orqali</div>
                    <div className="text-xs text-gray-500">Bot kodi bilan kirish</div>
                  </div>
                </button>

                <button
                  onClick={() => changeStep("sms-phone")}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-green-100 bg-green-50 hover:bg-green-100 hover:border-green-200 transition-all text-left"
                  data-testid="button-phone-auth"
                >
                  <div className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="text-white" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Telefon raqami orqali</div>
                    <div className="text-xs text-gray-500">SMS kod bilan kirish</div>
                  </div>
                </button>

                <div className="text-center text-sm pt-2">
                  <span className="text-gray-500">Hisobingiz yo'qmi? </span>
                  <span className="text-gray-700 font-medium">Ro'yxatdan o'tish ham shu yerda</span>
                </div>
              </div>
            )}

            {/* Telegram kodi */}
            {step === "telegram-code" && (
              <form onSubmit={handleVerifyTelegram} className="space-y-4">
                <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
                  <p className="text-center mb-3">Telegram botdan kod oling va shu yerga kiriting</p>
                  <a
                    href="https://t.me/uzfitboom_bot?start=auth"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-600 transition-colors"
                    data-testid="link-open-bot"
                  >
                    <Send size={16} />
                    Telegram botni ochish
                  </a>
                </div>
                <Input
                  type="text"
                  placeholder="XXXXXXXX"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  data-testid="input-login-code"
                  autoFocus
                  className="text-center text-2xl font-mono tracking-widest h-14 rounded-2xl border-2"
                  maxLength={8}
                />
                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 font-semibold"
                  disabled={verifyTelegramMutation.isPending}
                  data-testid="button-verify-code"
                >
                  {verifyTelegramMutation.isPending ? "Tekshirilmoqda..." : "Tasdiqlash"}
                </Button>
              </form>
            )}

            {/* SMS - telefon raqam */}
            {step === "sms-phone" && (
              <form onSubmit={handleSendSms} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">+998</span>
                  <Input
                    type="tel"
                    placeholder="90 123 45 67"
                    value={phone.startsWith('+998') ? phone.slice(4) : phone.startsWith('998') ? phone.slice(3) : phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setPhone('+998' + digits);
                    }}
                    data-testid="input-phone"
                    autoFocus
                    className="h-14 rounded-2xl border-2 pl-16 text-lg font-medium"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-600 font-semibold"
                  disabled={sendSmsMutation.isPending}
                  data-testid="button-send-sms"
                >
                  {sendSmsMutation.isPending ? "Yuborilmoqda..." : "SMS yuborish"}
                </Button>
              </form>
            )}

            {/* SMS - kod tasdiqlash */}
            {step === "sms-code" && (
              <form onSubmit={handleVerifySms} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="------"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  data-testid="input-sms-code"
                  autoFocus
                  className="text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-2xl border-2"
                  maxLength={6}
                />
                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-600 font-semibold"
                  disabled={verifySmsMutation.isPending}
                  data-testid="button-verify-sms"
                >
                  {verifySmsMutation.isPending ? "Tekshirilmoqda..." : "Tasdiqlash"}
                </Button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-500">{countdown} soniyadan so'ng qayta yuborish</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendSmsMutation.mutate(phone)}
                      disabled={sendSmsMutation.isPending}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                      data-testid="button-resend-sms"
                    >
                      Qayta yuborish
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profil to'ldirish dialogi */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="dialog-complete-profile">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Profilni to'ldirish</DialogTitle>
            <DialogDescription>
              Davom etish uchun quyidagi ma'lumotlarni to'ldiring
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => completeProfileMutation.mutate(d))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ismingiz</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ismingizni kiriting" data-testid="input-name" className="rounded-xl" />
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        min={10}
                        max={120}
                        data-testid="input-age"
                        className="rounded-xl"
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
                        <SelectTrigger data-testid="select-gender" className="rounded-xl">
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
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 h-12 font-semibold"
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
