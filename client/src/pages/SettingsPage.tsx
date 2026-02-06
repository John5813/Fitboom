import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Shield, Handshake, Send, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isGymOwnerLoginOpen, setIsGymOwnerLoginOpen] = useState(false);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [gymOwnerCode, setGymOwnerCode] = useState("");
  const [hallName, setHallName] = useState("");
  const [phone, setPhone] = useState("");

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
              maxLength={6}
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
