import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Camera, User, History, CheckCircle } from "lucide-react";
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
  // Include both completed and missed bookings in history
  const completedBookings = bookings.filter(b => b.isCompleted || b.status === 'missed');

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
      toast({
        title: t('common.success'),
        description: t('profile.success_update'),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
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

      if (!response.ok) {
        throw new Error('Rasm yuklashda xatolik');
      }

      const data = await response.json();
      updateProfileMutation.mutate({ profileImageUrl: data.imageUrl });
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Rasm yuklashda xatolik",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      updateProfileMutation.mutate({ name: editName.trim() });
    }
  };

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
        <h1 className="font-display font-bold text-2xl">{t('profile.title')}</h1>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={(user as any)?.profileImageUrl || undefined}
                  alt={user?.name || "Profile"}
                />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-12 h-12" />}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-image"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold" data-testid="text-user-name">
                {user?.name || t('profile.user')}
              </h2>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm" data-testid="text-user-phone">
                  📱 {user?.phone || t('profile.no_phone')}
                </p>
                {(user as any)?.gender && (
                  <p className="text-muted-foreground text-sm" data-testid="text-user-gender">
                    {(user as any).gender === "Erkak" ? t('profile.male') : t('profile.female')}
                  </p>
                )}
                {(user as any)?.age && (
                  <p className="text-muted-foreground text-sm" data-testid="text-user-age">
                    🎂 {(user as any).age} {t('profile.age')}
                  </p>
                )}
              </div>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-edit-profile">
                  <Pencil className="h-4 w-4" />
                  {t('profile.edit')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('profile.edit_title')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">{t('profile.name')}</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t('profile.enter_name')}
                      data-testid="input-edit-name"
                    />
                  </div>
                  <Button
                    onClick={handleSaveName}
                    disabled={updateProfileMutation.isPending}
                    className="w-full"
                    data-testid="button-save-name"
                  >
                    {updateProfileMutation.isPending ? t('profile.saving') : t('profile.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md mx-auto mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{t('profile.credits_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary" data-testid="text-credits">
            {user?.credits || 0} {t('profile.credits_count')}
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-md mx-auto mt-4">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('profile.history_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedBookings.length > 0 ? (
            <div className="space-y-3">
              {completedBookings.map((booking) => {
                const gym = gyms.find(g => g.id === booking.gymId);
                return (
                  <div
                    key={booking.id}
                    className={`flex items-center gap-3 p-3 rounded-md ${booking.status === 'missed' ? 'bg-red-100' : 'bg-muted/50'}`}
                    data-testid={`booking-history-${booking.id}`}
                  >
                    {booking.status === 'missed' ? (
                      <CheckCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{gym?.name || t('profile.unknown_gym')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'uz-UZ', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })} - {booking.time}
                      </p>
                      {booking.status === 'missed' && (
                        <p className="text-red-600 text-xs mt-1">{t('profile.missed')}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {t('profile.no_history')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}