import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Camera, User, CheckCircle2, XCircle, Clock,
  Phone, CreditCard, Dumbbell, Pencil, Calendar, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import type { Booking, Gym } from "@shared/schema";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: bookingsData } = useQuery<{ bookings: Booking[] }>({
    queryKey: ['/api/bookings'],
    enabled: !!user,
  });

  const { data: gymsData } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const bookings = bookingsData?.bookings || [];
  const gyms = gymsData?.gyms || [];

  const completedBookings = bookings.filter(b => b.isCompleted || b.status === 'missed');
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; profileImageUrl?: string }) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: t('common.success'), description: t('profile.success_update') });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('Rasm yuklashda xatolik');
      const data = await response.json();
      updateProfileMutation.mutate({ profileImageUrl: data.imageUrl });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message || "Rasm yuklashda xatolik", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) updateProfileMutation.mutate({ name: editName.trim() });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'uz-UZ',
      { day: 'numeric', month: 'short' }
    );
  };

  const expiryText = () => {
    if (!user?.creditExpiryDate || !user?.credits) return null;
    const days = Math.ceil((new Date(user.creditExpiryDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return { text: "Muddati o'tgan", color: "text-red-500 bg-red-50 dark:bg-red-950/30" };
    if (days <= 7) return { text: `${days} kun qoldi`, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30" };
    return { text: `${days} kun`, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" };
  };
  const expiry = expiryText();

  return (
    <div className="min-h-screen bg-background">

      {/* Hero gradient header */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 pb-20 pt-safe">
        <div className="absolute inset-0 bg-black/10" />

        {/* Back button */}
        <div className="relative flex items-center px-4 pt-4 pb-2">
          <button
            onClick={() => setLocation('/home')}
            className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="ml-3 text-white font-bold text-lg">{t('profile.title')}</span>
          <button
            onClick={() => setIsEditDialogOpen(true)}
            className="ml-auto h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
            data-testid="button-edit-profile"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar */}
        <div className="relative flex flex-col items-center mt-4">
          <div className="relative">
            <Avatar className="w-24 h-24 ring-4 ring-white/40 shadow-2xl">
              <AvatarImage
                src={(user as any)?.profileImageUrl || undefined}
                alt={user?.name || "Profile"}
                className="object-cover"
              />
              <AvatarFallback className="text-3xl font-bold bg-white/30 text-white backdrop-blur-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center text-orange-500 active:scale-90 transition-transform disabled:opacity-60"
              data-testid="button-upload-image"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <h1 className="mt-3 text-xl font-bold text-white" data-testid="text-user-name">
            {user?.name || t('profile.user')}
          </h1>
          <p className="text-white/70 text-sm mt-0.5" data-testid="text-user-phone">
            {user?.phone || t('profile.no_phone')}
          </p>

          {/* Gender & age badges */}
          {((user as any)?.gender || (user as any)?.age) && (
            <div className="flex items-center gap-2 mt-2">
              {(user as any)?.gender && (
                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {(user as any).gender === 'Erkak' ? t('profile.male') : t('profile.female')}
                </span>
              )}
              {(user as any)?.age && (
                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {(user as any).age} {t('profile.age')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats strip - floated up */}
      <div className="max-w-md mx-auto px-4 -mt-10 relative z-10">
        <div className="bg-card rounded-2xl shadow-xl border grid grid-cols-3 divide-x overflow-hidden">
          <div className="flex flex-col items-center py-4 px-2">
            <div className="flex items-center gap-1">
              <CreditCard className="h-4 w-4 text-orange-500" />
              <span className="text-lg font-bold" data-testid="text-credits">{user?.credits ?? 0}</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Kredit</span>
          </div>
          <div className="flex flex-col items-center py-4 px-2">
            <div className="flex items-center gap-1">
              <Dumbbell className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-bold">{bookings.length}</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Jami bron</span>
          </div>
          <div className="flex flex-col items-center py-4 px-2">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-lg font-bold">{completedBookings.length}</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Bajarildi</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 mt-4 pb-10 space-y-4">

        {/* Kredit muddat */}
        {expiry && (user?.credits ?? 0) > 0 && (
          <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${expiry.color}`}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Kredit muddati</span>
            </div>
            <span className="text-sm font-bold">{expiry.text}</span>
          </div>
        )}

        {/* Personal info */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ma'lumotlar</h2>
          </div>
          <div className="divide-y">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground">Telefon</p>
                <p className="text-sm font-medium" data-testid="text-user-phone-detail">{user?.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground">Ism</p>
                <p className="text-sm font-medium">{user?.name || "—"}</p>
              </div>
              <button
                onClick={() => setIsEditDialogOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {(user as any)?.gender && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Jins</p>
                  <p className="text-sm font-medium">
                    {(user as any).gender === 'Erkak' ? t('profile.male') : t('profile.female')}
                  </p>
                </div>
              </div>
            )}
            {(user as any)?.age && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Yosh</p>
                  <p className="text-sm font-medium">{(user as any).age} {t('profile.age')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active bookings */}
        {activeBookings.length > 0 && (
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faol bronlar</h2>
              <Badge variant="secondary" className="text-[10px]">{activeBookings.length}</Badge>
            </div>
            <div className="divide-y">
              {activeBookings.map(b => {
                const gym = gyms.find(g => g.id === b.gymId);
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3" data-testid={`active-booking-${b.id}`}>
                    <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                      <Dumbbell className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{gym?.name || "Zal"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.date)} · {b.time}</p>
                    </div>
                    <div className={`h-6 px-2 rounded-full flex items-center gap-1 text-[10px] font-medium ${
                      b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400'
                    }`}>
                      <Clock className="h-2.5 w-2.5" />
                      {b.status === 'confirmed' ? 'Tasdiqlangan' : 'Kutilmoqda'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('profile.history_title')}</h2>
            {completedBookings.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{completedBookings.length}</Badge>
            )}
          </div>
          {completedBookings.length > 0 ? (
            <div className="divide-y">
              {[...completedBookings]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(booking => {
                  const gym = gyms.find(g => g.id === booking.gymId);
                  const isMissed = booking.status === 'missed';
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 px-4 py-3"
                      data-testid={`booking-history-${booking.id}`}
                    >
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isMissed ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'
                      }`}>
                        {isMissed
                          ? <XCircle className="h-4 w-4 text-red-500" />
                          : <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{gym?.name || t('profile.unknown_gym')}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(booking.date)} · {booking.time}</p>
                      </div>
                      {isMissed && (
                        <span className="text-[10px] font-medium text-red-500">{t('profile.missed')}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 px-4">
              <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Dumbbell className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.no_history')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit name dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('profile.edit_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('profile.name')}</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('profile.enter_name')}
                className="mt-1.5 h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                data-testid="input-edit-name"
              />
            </div>
            <Button
              onClick={handleSaveName}
              disabled={updateProfileMutation.isPending || !editName.trim()}
              className="w-full h-11"
              data-testid="button-save-name"
            >
              {updateProfileMutation.isPending ? t('profile.saving') : t('profile.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
