import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, Users, DollarSign, CreditCard, Edit, LogOut, ArrowLeft, Loader2, X, Clock, Trash2, QrCode, Settings, UserRound, TrendingUp, CalendarDays, MapPin, Activity } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScheduleTab from "@/components/gym-owner/ScheduleTab";
import type { GymVisit, GymPayment, TimeSlot } from "@shared/schema";

interface GymOwnerData {
  gym: {
    id: string;
    name: string;
    imageUrl?: string;
    images?: string[];
    address?: string;
    hours?: string;
    closedDays?: string[];
    totalEarnings: number;
    currentDebt: number;
    qrCode?: string | null;
  };
  visits: GymVisit[];
  payments: GymPayment[];
}

/** Bitta statistika katakchasi — raqam sig'masa kesilmasligi uchun ixcham yozuv */
function StatCard({ label, icon, value, hint, accent, title, testId }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  hint?: string;
  accent?: boolean;
  title?: string;
  testId?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">{icon}</div>
        </div>
        <p
          className={`truncate text-2xl font-bold tabular-nums ${accent ? "text-green-600" : ""}`}
          title={title}
          data-testid={testId}
        >
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function GymOwnerPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", imageUrl: "", images: [] as string[] });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      const res = await fetch("/api/upload-images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (data.imageUrls) {
        setEditForm((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...data.imageUrls],
          imageUrl: prev.imageUrl || data.imageUrls[0]
        }));
        toast({
          title: "Muvaffaqiyatli",
          description: `${data.imageUrls.length} ta rasm yuklandi`,
        });
      }
    } catch {
      toast({
        title: "Xatolik",
        description: "Rasmlarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      // If we removed the main image, pick the next available one
      imageUrl: prev.imageUrl === prev.images[index] 
        ? (prev.images.filter((_, i) => i !== index)[0] || "") 
        : prev.imageUrl
    }));
  };
  const [showVisitors, setShowVisitors] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<GymVisit | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isSwitchModeDialogOpen, setIsSwitchModeDialogOpen] = useState(false);
  const [switchModeCode, setSwitchModeCode] = useState('');
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const gymId = localStorage.getItem("gymOwnerId");
  const accessCode = localStorage.getItem("gymOwnerCode");

  // Zal egasining amallari serverda kirish kodi bilan tekshiriladi.
  // Ilgari bu endpointlar faqat "tizimga kirgan" shartini talab qilardi,
  // ya'ni istalgan foydalanuvchi istalgan zalning slotlarini boshqara olardi.
  const ownerHeaders = (extra: Record<string, string> = {}) => ({
    ...extra,
    ...(accessCode ? { "X-Gym-Access-Code": accessCode } : {}),
  });

  const generateAndShowQR = async (qrCodeData: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(qrCodeData, { 
        width: 400, 
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrImageUrl(url);
      setShowQRCode(true);
    } catch {
      toast({ title: "Xatolik", description: "QR kod yaratishda xatolik", variant: "destructive" });
    }
  };

  const handleDownloadQR = () => {
    if (!qrImageUrl) return;
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `fitboom-qr.png`;
    a.click();
  };

  useEffect(() => {
    if (!gymId || !accessCode) {
      setLocation("/settings");
    } else {
      localStorage.setItem("lastUserRole", "gymOwner");
      // Push an extra history entry so the browser back button doesn't escape the panel
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [gymId, accessCode, setLocation]);

  const handleSwitchToUserMode = async () => {
    if (!switchModeCode.trim()) return;
    setIsSwitchingMode(true);
    try {
      const res = await fetch('/api/gym-owner/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessCode: switchModeCode.trim().toUpperCase() }),
      });
      const resData = await res.json();
      if (res.ok && resData.gym?.id === gymId) {
        localStorage.removeItem("gymOwnerId");
        localStorage.removeItem("gymOwnerCode");
        localStorage.setItem("lastUserRole", "user");
        setIsSwitchModeDialogOpen(false);
        setIsSettingsDialogOpen(false);
        setSwitchModeCode('');
        setLocation("/home");
        toast({ title: "Foydalanuvchi rejimi", description: "Mijoz paneliga o'tdingiz" });
      } else {
        toast({ title: "Xato kod", description: "Kiritilgan kod noto'g'ri", variant: "destructive" });
      }
    } catch {
      toast({ title: "Xatolik", description: "Server bilan bog'lanishda xatolik", variant: "destructive" });
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const { data, isLoading, isError } = useQuery<GymOwnerData>({
    queryKey: ["/api/gym-owner", gymId],
    queryFn: async () => {
      // Kirish kodi endi server tomonda tekshiriladi (ilgari bu endpoint
      // umuman himoyalanmagan edi), shuning uchun uni sarlavhada yuboramiz.
      const res = await fetch(`/api/gym-owner/${gymId}`, {
        credentials: "include",
        headers: ownerHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch gym data");
      return res.json();
    },
    enabled: !!gymId,
  });

  // Bugungi sana — bandlik SANAGA bog'liq, shuning uchun so'rovga qo'shiladi.
  // Sanasiz `availableSpots` ma'nosiz: slotlar haftalik shablon.
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const { data: timeSlotsData } = useQuery<{ timeSlots: Array<TimeSlot & { bookedCount?: number; state?: string }> }>({
    queryKey: ['/api/time-slots', gymId, todayIso],
    refetchInterval: 15000,
    enabled: !!gymId,
    queryFn: () =>
      fetch(`/api/time-slots?gymId=${gymId}&date=${todayIso}`, { credentials: 'include' }).then(res => res.json()),
  });

  const timeSlots = timeSlotsData?.timeSlots || [];

  const updateGymMutation = useMutation({
    mutationFn: async (updateData: { name?: string; imageUrl?: string; images?: string[] }) => {
      const response = await apiRequest(`/api/gym-owner/${gymId}`, "PUT", {
        ...updateData,
        accessCode,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gym-owner", gymId] });
      queryClient.invalidateQueries({ queryKey: ["/api/gyms"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Zal ma'lumotlari yangilandi",
      });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Ma'lumotlarni yangilashda xatolik yuz berdi",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("gymOwnerId");
    localStorage.removeItem("gymOwnerCode");
    setLocation("/settings");
    toast({
      title: "Chiqildi",
      description: "Zal egasi hisobidan chiqdingiz",
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await response.json();
      if (data.imageUrl) {
        setEditForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
        toast({
          title: "Rasm yuklandi",
          description: "Yangi rasm muvaffaqiyatli yuklandi",
        });
      }
    } catch {
      toast({
        title: "Xatolik",
        description: "Rasm yuklashda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const openEditDialog = () => {
    if (data?.gym) {
      setEditForm({
        name: data.gym.name,
        imageUrl: data.gym.imageUrl || "",
        images: data.gym.images || [],
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    const updateData: { name?: string; imageUrl?: string; images?: string[] } = {};
    if (editForm.name && editForm.name !== data?.gym.name) {
      updateData.name = editForm.name;
    }
    if (editForm.imageUrl && editForm.imageUrl !== data?.gym.imageUrl) {
      updateData.imageUrl = editForm.imageUrl;
    }
    if (JSON.stringify(editForm.images) !== JSON.stringify(data?.gym.images)) {
      updateData.images = editForm.images;
    }
    
    if (Object.keys(updateData).length > 0) {
      updateGymMutation.mutate(updateData);
    } else {
      setIsEditDialogOpen(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  /**
   * Statistika kartalari uchun ixcham yozuv: 1 500 000 -> "1,5 mln".
   * Ilgari to'liq summa `text-2xl` bilan yarim kenglikdagi kartaga sig'masdi.
   */
  const formatCompactSom = (amount: number) => {
    if (amount >= 1_000_000) {
      const mln = amount / 1_000_000;
      return `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 1 }).format(mln)} mln`;
    }
    if (amount >= 10_000) {
      return `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(amount / 1000)} ming`;
    }
    return new Intl.NumberFormat("uz-UZ").format(amount);
  };

  if (!gymId || !accessCode) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Ma'lumotlarni yuklashda xatolik</p>
        <Button onClick={() => setLocation("/settings")} data-testid="button-back-to-settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Orqaga
        </Button>
      </div>
    );
  }

  // Kutilmagan javob shaklida ham sahifa qulamasligi uchun standart qiymatlar
  const { gym } = data;
  const visits = data.visits ?? [];
  const payments = data.payments ?? [];

  const now = new Date();
  const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayLocal = localDate(now);

  const todayVisits = visits.filter(v => localDate(new Date(v.visitDate)) === todayLocal);
  const todayRevenue = todayVisits.reduce((s, v) => s + v.amountEarned, 0);
  const thisMonthVisits = visits.filter(v => {
    const d = new Date(v.visitDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthRevenue = thisMonthVisits.reduce((s, v) => s + v.amountEarned, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const currentBalance = gym.totalEarnings - totalPaid;
  const totalOccupied = timeSlots.reduce((s, t) => s + (t.capacity - t.availableSpots), 0);
  const totalCapacity = timeSlots.reduce((s, t) => s + t.capacity, 0);
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const recentVisits = [...visits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()).slice(0, 5);
  const sortedPayments = [...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  const cleanAddress = gym.address ? gym.address.replace(/https?:\/\/[^\s]+/g, '').replace(/,\s*$/, '').trim() : '';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {gym.imageUrl ? (
              <img src={gym.imageUrl} alt={gym.name} className="w-9 h-9 rounded-lg object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate" data-testid="text-gym-name">{gym.name}</h1>
              <p className="text-[11px] text-muted-foreground truncate">Zal egasi paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={openEditDialog} data-testid="button-edit-gym">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsSettingsDialogOpen(true)} data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-6xl mx-auto">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="today" data-testid="tab-today">Bugun</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Jadval</TabsTrigger>
            <TabsTrigger value="finance" data-testid="tab-finance">Hisob-kitob</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4">
            <ScheduleTab gymId={gymId} ownerHeaders={ownerHeaders} />
          </TabsContent>

          <TabsContent value="today" className="mt-4 space-y-4">
        {/* Desktop'da QR va zal kartochkasi yonma-yon turadi */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        {/* Gym QR Code — Primary Action */}
        <button
          onClick={() => gym.qrCode ? generateAndShowQR(gym.qrCode) : toast({ title: "QR kod yo'q", description: "Bu zal uchun QR kod hali yaratilmagan", variant: "destructive" })}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 shadow-lg active:scale-[0.98] transition-transform"
          data-testid="button-show-qr"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-lg font-bold">Zalning QR Kodi</p>
              <p className="text-sm opacity-80">Mijozlar shu kodni skanerlaydi</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
              <QrCode className="h-7 w-7" />
            </div>
          </div>
        </button>

        {/* Gym Info Card */}
        <Card className="overflow-hidden border-0 shadow-sm" data-testid="card-gym-info">
          {gym.images && gym.images.length > 0 ? (
            <div className="relative h-40">
              <img src={gym.images[0]} alt={gym.name} className="w-full h-full object-cover" data-testid="img-gym" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2 className="text-white font-bold text-xl" data-testid="text-gym-title">{gym.name}</h2>
                {cleanAddress && (
                  <p className="text-white/80 text-sm flex items-center gap-1.5 mt-1" data-testid="text-gym-address">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {cleanAddress}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <CardContent className="p-4">
              <h2 className="font-bold text-lg" data-testid="text-gym-title">{gym.name}</h2>
              {cleanAddress && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1" data-testid="text-gym-address">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {cleanAddress}
                </p>
              )}
            </CardContent>
          )}
          <div className="px-4 py-3 flex items-center gap-4 border-t bg-background">
            {gym.hours && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{gym.hours}</span>
              </div>
            )}
            {gym.closedDays && gym.closedDays.length > 0 && (
              <div className="flex items-center gap-1">
                {['Ya','Du','Se','Ch','Pa','Ju','Sh'].map((label, i) =>
                  gym.closedDays!.includes(String(i)) ? (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium" data-testid={`text-closed-day-${i}`}>
                      {label}
                    </span>
                  ) : null
                )}
              </div>
            )}
          </div>
        </Card>
        </div>

        {/*
          Statistika kartalari.
          Rang endi ma'no tashiydi: faqat pul yashil, qolgani neytral.
          Ilgari 4 ta karta 4 xil rangda edi va ranglar hech narsani anglatmasdi.
        */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Bugun"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            value={String(todayVisits.length)}
            hint="tashrif"
            testId="text-today-visitors"
          />
          <StatCard
            label="Bugungi daromad"
            icon={<DollarSign className="h-4 w-4 text-green-600" />}
            value={formatCompactSom(todayRevenue)}
            hint="so'm"
            accent
            title={formatCurrency(todayRevenue)}
            testId="text-today-revenue"
          />
          <StatCard
            label="Shu oy"
            icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
            value={String(thisMonthVisits.length)}
            hint={`${formatCompactSom(thisMonthRevenue)} so'm`}
            title={formatCurrency(thisMonthRevenue)}
            testId="text-month-visitors"
          />
          <StatCard
            label="Bugungi bandlik"
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            value={`${occupancyPercent}%`}
            hint={`${totalOccupied}/${totalCapacity} joy`}
            testId="text-occupancy"
          />
        </div>

        {/* Recent Visitors */}
        {recentVisits.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  So'nggi tashriflar
                </CardTitle>
                <button onClick={() => setShowVisitors(true)} className="text-xs text-primary font-medium" data-testid="link-all-visitors">
                  Barchasini ko'rish
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-2">
                {recentVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedVisitor(visit)}
                    data-testid={`recent-visitor-${visit.id}`}
                  >
                    <Avatar className="h-9 w-9">
                      {visit.visitorProfileImage && <img src={visit.visitorProfileImage} alt={visit.visitorName} className="h-full w-full object-cover" />}
                      <AvatarFallback className="text-sm bg-primary/10 text-primary">{visit.visitorName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{visit.visitorName}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(visit.visitDate)}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">+{formatCurrency(visit.amountEarned)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

          </TabsContent>

          <TabsContent value="finance" className="mt-4 space-y-4">
        {/* Balans */}
        <Card className="overflow-hidden" data-testid="card-your-earnings">
          <div className="bg-green-500/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">Joriy balans</p>
                <p className="text-3xl font-bold tabular-nums text-green-600 break-words" data-testid="text-your-earnings">
                  {formatCurrency(currentBalance)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  Jami ishlangan: {formatCurrency(gym.totalEarnings)} • To'langan: {formatCurrency(totalPaid)}
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </Card>

        {/* Payments */}
        <Card data-testid="card-payments">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              To'lovlar tarixi
              {payments.length > 0 && <Badge variant="secondary" className="text-xs">{payments.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {payments.length === 0 ? (
              <div className="py-6 text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Hali to'lovlar amalga oshirilmagan</p>
              </div>
            ) : (
              <ScrollArea className={payments.length > 5 ? "h-64" : ""}>
              <div className="space-y-2">
                {sortedPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30" data-testid={`row-payment-${payment.id}`}>
                    <div>
                      <p className="text-sm font-medium text-green-600">+{formatCurrency(payment.amount)}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground max-w-[120px] truncate">{payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

          </TabsContent>
        </Tabs>

        <div className="pb-4" />
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zalni tahrirlash</DialogTitle>
            <DialogDescription>Zal ma'lumotlarini o'zgartirish</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Zal nomi</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Zal nomini kiriting"
                data-testid="input-edit-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Zal rasmlari</Label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {editForm.images?.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {img === editForm.imageUrl && (
                      <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-white text-center py-0.5">
                        Asosiy
                      </div>
                    )}
                    <button
                      onClick={() => setEditForm(prev => ({ ...prev, imageUrl: img }))}
                      className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium"
                    >
                      Asosiy qilish
                    </button>
                  </div>
                ))}
              </div>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleImagesUpload}
                disabled={uploadingImage}
                data-testid="input-edit-images"
              />
              {uploadingImage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yuklanmoqda...
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
                Bekor qilish
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateGymMutation.isPending || uploadingImage}
                data-testid="button-save-edit"
              >
                {updateGymMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  "Saqlash"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Zalning QR Kodi
            </DialogTitle>
            <DialogDescription>
              Shu QR kodni eshik oldiga yoki devorga qo'ying — mijozlar telefonlari bilan skanerlaydi
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrImageUrl ? (
              <div className="p-4 bg-white rounded-2xl shadow-sm border">
                <img src={qrImageUrl} alt="Zal QR kodi" className="w-64 h-64" data-testid="img-gym-qr" />
              </div>
            ) : (
              <div className="w-64 h-64 bg-muted rounded-2xl flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center font-medium">{gym.name}</p>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" onClick={() => setShowQRCode(false)} data-testid="button-close-qr">
                Yopish
              </Button>
              <Button onClick={handleDownloadQR} disabled={!qrImageUrl} data-testid="button-download-qr">
                Yuklab olish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVisitors} onOpenChange={setShowVisitors}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tashriflar ({visits.length})
            </DialogTitle>
            <DialogDescription>Zal tashrifchilarining ro'yxati</DialogDescription>
          </DialogHeader>
          {visits.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Hali tashriflar yo'q
            </div>
          ) : (
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-4">
                {[...visits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()).map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover-elevate"
                    onClick={() => setSelectedVisitor(visit)}
                    data-testid={`visitor-card-${visit.id}`}
                  >
                    <Avatar>
                      {visit.visitorProfileImage && (
                        <img src={visit.visitorProfileImage} alt={visit.visitorName} className="h-full w-full object-cover" />
                      )}
                      <AvatarFallback>{visit.visitorName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{visit.visitorName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(visit.visitDate)}</p>
                    </div>
                    <Badge variant="secondary">{visit.creditsUsed} kr</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/*
        Eski "Vaqt slotlari" modali olib tashlandi — uning o'rnini "Jadval" tabi
        egalladi. Modal ichidagi tekis ro'yxatda haftalik manzarani ko'rib
        bo'lmasdi va pik vaqt tushunchasi uchun joy yo'q edi.
      */}

      <Dialog open={!!selectedVisitor} onOpenChange={() => setSelectedVisitor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mehmon profili</DialogTitle>
            <DialogDescription>Tashrifchi haqida ma'lumot</DialogDescription>
          </DialogHeader>
          {selectedVisitor && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-20 w-20">
                {selectedVisitor.visitorProfileImage && (
                  <img src={selectedVisitor.visitorProfileImage} alt={selectedVisitor.visitorName} className="h-full w-full object-cover" />
                )}
                <AvatarFallback className="text-2xl">{selectedVisitor.visitorName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-bold">{selectedVisitor.visitorName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tashrif: {formatDate(selectedVisitor.visitDate)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mt-2">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Kredit</p>
                    <p className="text-lg font-bold">{selectedVisitor.creditsUsed}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Summa</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedVisitor.amountEarned)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-owner-settings">
          <DialogHeader>
            <DialogTitle>Sozlamalar</DialogTitle>
            <DialogDescription>Zal egasi paneli sozlamalari</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-muted transition-colors text-left"
              onClick={() => { setIsSwitchModeDialogOpen(true); setSwitchModeCode(''); }}
              data-testid="button-switch-to-user"
            >
              <UserRound className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Foydalanuvchi rejimiga o'tish</p>
                <p className="text-xs text-muted-foreground">Mijoz paneliga qaytish uchun kodni tasdiqlang</p>
              </div>
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/30 hover:bg-destructive/5 transition-colors text-left"
              onClick={() => { setIsSettingsDialogOpen(false); handleLogout(); }}
              data-testid="button-logout-settings"
            >
              <LogOut className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-sm text-destructive">Hisobdan chiqish</p>
                <p className="text-xs text-muted-foreground">Zal egasi sifatida tizimdan chiqish</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Switch to User Mode Dialog */}
      <Dialog open={isSwitchModeDialogOpen} onOpenChange={(open) => { setIsSwitchModeDialogOpen(open); if (!open) setSwitchModeCode(''); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-switch-mode">
          <DialogHeader>
            <DialogTitle>Foydalanuvchi rejimiga o'tish</DialogTitle>
            <DialogDescription>
              Mijoz paneliga o'tish uchun zal egasi kodini qayta kiriting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="switch-code">Maxsus kod</Label>
              <Input
                id="switch-code"
                type="text"
                value={switchModeCode}
                onChange={(e) => setSwitchModeCode(e.target.value.toUpperCase())}
                placeholder="Masalan: ABC123"
                maxLength={6}
                className="mt-1 font-mono tracking-widest text-center text-lg uppercase"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSwitchToUserMode(); }}
                data-testid="input-switch-code"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSwitchToUserMode}
                disabled={isSwitchingMode || switchModeCode.length < 4}
                className="flex-1"
                data-testid="button-confirm-switch"
              >
                {isSwitchingMode ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Tasdiqlash
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsSwitchModeDialogOpen(false); setSwitchModeCode(''); }}
                className="flex-1"
                data-testid="button-cancel-switch"
              >
                Bekor qilish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
