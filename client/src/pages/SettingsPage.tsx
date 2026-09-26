import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Shield, Handshake, Send, Building2, FileText, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { LEGAL_DOCS } from "@/content/legal";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isGymOwnerLoginOpen, setIsGymOwnerLoginOpen] = useState(false);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [gymOwnerCode, setGymOwnerCode] = useState("");
  const [hallName, setHallName] = useState("");
  const [phone, setPhone] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/account/delete', 'POST', { confirm: deleteConfirm });
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      localStorage.removeItem("gymOwnerId");
      localStorage.removeItem("gymOwnerCode");
      localStorage.removeItem("lastUserRole");
      sessionStorage.clear();
      toast({ title: "Hisob o'chirildi", description: "Ma'lumotlaringiz o'chirildi." });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Hisobni o'chirib bo'lmadi. Keyinroq urinib ko'ring.",
        variant: "destructive",
      });
    },
  });

  const verifyAdminMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      setIsAdminLoginOpen(false);
      setAdminPassword("");
      localStorage.setItem("lastUserRole", "admin");
      setLocation('/admin');
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('settings.enter_password'),
        variant: "destructive",
      });
    },
  });

  const verifyGymOwnerMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      const response = await fetch('/api/gym-owner/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsGymOwnerLoginOpen(false);
      localStorage.setItem('gymOwnerCode', gymOwnerCode.toUpperCase());
      localStorage.setItem('gymOwnerId', data.gym.id);
      localStorage.setItem("lastUserRole", "gymOwner");
      setGymOwnerCode("");
      setLocation('/gym-owner');
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('settings.enter_code'),
        variant: "destructive",
      });
    },
  });

  const partnerRequestMutation = useMutation({
    mutationFn: async (data: { hallName: string; phone: string }) => {
      const response = await fetch('/api/partnership-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('settings.request_sent'),
      });
      setIsPartnerDialogOpen(false);
      setHallName("");
      setPhone("");
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdminLogin = () => {
    if (adminPassword.trim()) {
      verifyAdminMutation.mutate(adminPassword);
    }
  };

  const handleGymOwnerLogin = () => {
    if (gymOwnerCode.trim()) {
      verifyGymOwnerMutation.mutate(gymOwnerCode.trim());
    }
  };

  const handlePartnerRequest = () => {
    if (hallName.trim() && phone.trim()) {
      partnerRequestMutation.mutate({ hallName: hallName.trim(), phone: phone.trim() });
    }
  };

  const isPartnerFormValid = hallName.trim() && phone.trim();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/home')}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display font-bold text-2xl">{t('settings.title')}</h1>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setIsAdminLoginOpen(true)}
          data-testid="card-admin-login"
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t('settings.admin')}</h3>
              <p className="text-sm text-muted-foreground">{t('settings.admin_desc')}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setIsGymOwnerLoginOpen(true)}
          data-testid="card-gym-owner-login"
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-blue-500/10">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">{t('settings.gym_owner')}</h3>
              <p className="text-sm text-muted-foreground">{t('settings.gym_owner_desc')}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setIsPartnerDialogOpen(true)}
          data-testid="card-partner-request"
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <Handshake className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">{t('settings.partner')}</h3>
              <p className="text-sm text-muted-foreground">{t('settings.partner_desc')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Huquqiy hujjatlar */}
        <Card>
          <CardContent className="p-2">
            {LEGAL_DOCS.map((doc) => (
              <Link key={doc.slug} href={`/legal/${doc.slug}`}>
                <div
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/60"
                  data-testid={`card-legal-${doc.slug}`}
                >
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{doc.summary}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Hisobni o'chirish — qaytarib bo'lmaydigan amal, eng oxirida */}
        <Card className="border-destructive/30">
          <CardContent
            className="flex cursor-pointer items-center gap-4 p-4"
            onClick={() => { setDeleteConfirm(""); setIsDeleteOpen(true); }}
            data-testid="card-delete-account"
          >
            <div className="rounded-full bg-destructive/10 p-3">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-destructive">Hisobni o'chirish</h3>
              <p className="text-sm text-muted-foreground">
                Ma'lumotlaringiz o'chiriladi. Qaytarib bo'lmaydi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.admin_login')}</DialogTitle>
            <DialogDescription>
              {t('settings.admin_login_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder={t('settings.enter_password')}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              data-testid="input-admin-password"
            />
            <Button
              onClick={handleAdminLogin}
              disabled={verifyAdminMutation.isPending || !adminPassword.trim()}
              className="w-full"
              data-testid="button-admin-login-submit"
            >
              {verifyAdminMutation.isPending ? t('settings.checking') : t('settings.login')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGymOwnerLoginOpen} onOpenChange={setIsGymOwnerLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.gym_owner_login')}</DialogTitle>
            <DialogDescription>
              {t('settings.gym_owner_login_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={gymOwnerCode}
              onChange={(e) => setGymOwnerCode(e.target.value.toUpperCase())}
              placeholder={t('settings.enter_code')}
              onKeyDown={(e) => e.key === 'Enter' && handleGymOwnerLogin()}
              maxLength={8}
              data-testid="input-gym-owner-code"
            />
            <Button
              onClick={handleGymOwnerLogin}
              disabled={verifyGymOwnerMutation.isPending || !gymOwnerCode.trim()}
              className="w-full"
              data-testid="button-gym-owner-login-submit"
            >
              {verifyGymOwnerMutation.isPending ? t('settings.checking') : t('settings.login')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Hisobni o'chirish</DialogTitle>
            <DialogDescription>
              Ismingiz, telefon raqamingiz va Telegram ulanishingiz o'chiriladi.
              Qolgan kreditlaringiz kuyadi va qaytarilmaydi. Kelgusi bronlaringiz
              bekor qilinadi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm">
              Tasdiqlash uchun <span className="font-mono font-bold">O'CHIRISH</span> deb yozing:
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="O'CHIRISH"
              autoComplete="off"
              data-testid="input-delete-confirm"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDeleteOpen(false)}
                data-testid="button-cancel-delete"
              >
                Bekor qilish
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteConfirm !== "O'CHIRISH" || deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate()}
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartnerDialogOpen} onOpenChange={setIsPartnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.partner')}</DialogTitle>
            <DialogDescription>
              {t('settings.partner_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">{t('settings.hall_name')}</label>
              <Input
                value={hallName}
                onChange={(e) => setHallName(e.target.value)}
                placeholder={t('settings.hall_placeholder')}
                data-testid="input-hall-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.phone')}</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
                data-testid="input-partner-phone"
              />
            </div>
            <Button
              onClick={handlePartnerRequest}
              disabled={partnerRequestMutation.isPending || !isPartnerFormValid}
              className="w-full gap-2"
              data-testid="button-send-partner-request"
            >
              <Send className="h-4 w-4" />
              {partnerRequestMutation.isPending ? t('settings.sending') : t('settings.send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
