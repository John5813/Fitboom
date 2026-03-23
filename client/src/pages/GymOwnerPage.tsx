import { useState, useEffect } from "react";
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
import { Building2, Users, DollarSign, CreditCard, Edit, LogOut, ArrowLeft, Loader2, Eye, X, Clock, Trash2, QrCode, CheckCircle2, Settings, UserRound, TrendingUp, CalendarDays, MapPin, BarChart3, Activity } from "lucide-react";
import QRScanner from "@/components/QRScanner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  };
  visits: GymVisit[];
  payments: GymPayment[];
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
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; visitorName?: string; visitorProfileImage?: string } | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingCapacity, setEditingCapacity] = useState('');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isSwitchModeDialogOpen, setIsSwitchModeDialogOpen] = useState(false);
  const [switchModeCode, setSwitchModeCode] = useState('');
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const gymId = localStorage.getItem("gymOwnerId");
  const accessCode = localStorage.getItem("gymOwnerCode");

  const updateCapacityMutation = useMutation({
    mutationFn: async ({ slotId, capacity }: { slotId: string; capacity: number }) => {
      const response = await fetch(`/api/time-slots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ capacity }),
      });
      if (!response.ok) throw new Error("Failed to update capacity");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots', gymId] });
      toast({ title: "Muvaffaqiyatli", description: "Sig'im yangilandi" });
      setEditingSlotId(null);
    },
    onError: () => {
      toast({ title: "Xatolik", description: "Sig'imni yangilashda xatolik yuz berdi", variant: "destructive" });
    }
  });

  const verifyQRMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await fetch('/api/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ qrCode, gymId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "QR kodni tekshirishda xatolik");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setScanResult({
        success: true,
        message: "Tashrif muvaffaqiyatli qayd etildi",
        visitorName: data.visitorName,
        visitorProfileImage: data.visitorProfileImage
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gym-owner'] });
      setShowScanner(false);
    },
    onError: (error: any) => {
      setScanResult({
        success: false,
        message: error.message
      });
      setShowScanner(false);
    }
  });

  const handleScan = (data: string | null) => {
    if (data && !verifyQRMutation.isPending) {
      verifyQRMutation.mutate(data);
    }
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
      const res = await fetch(`/api/gym-owner/${gymId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gym data");
      return res.json();
    },
    enabled: !!gymId,
  });

  const { data: timeSlotsData } = useQuery<{ timeSlots: TimeSlot[] }>({
    queryKey: ['/api/time-slots', gymId],
    refetchInterval: 15000,
    enabled: !!gymId,
    queryFn: () => fetch(`/api/time-slots?gymId=${gymId}`, { credentials: 'include' }).then(res => res.json()),
  });

  const timeSlots = timeSlotsData?.timeSlots || [];

  const DAY_ORDER = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const groupedSlots = DAY_ORDER.map(day => ({
    day,
    slots: timeSlots.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const handleOwnerAutoGenerate = async () => {
    if (!gymId) return;
    setIsAutoGenerating(true);
    try {
      const response = await fetch('/api/time-slots/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gymId }),
      });
      const resData = await response.json();
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/time-slots', gymId] });
        toast({ title: "Muvaffaqiyatli", description: resData.message });
      } else {
        toast({ title: "Xatolik", description: resData.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Xatolik", description: "Server bilan bog'lanishda xatolik", variant: "destructive" });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/time-slots/${slotId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/time-slots', gymId] });
        toast({ title: "O'chirildi", description: "Vaqt sloti o'chirildi" });
      }
    } catch {
      toast({ title: "Xatolik", description: "O'chirishda xatolik", variant: "destructive" });
    }
  };

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

  const { gym, visits, payments } = data;

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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openEditDialog} data-testid="button-edit-gym">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSettingsDialogOpen(true)} data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* QR Scanner — Primary Action */}
        <button
          onClick={() => setShowScanner(true)}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 shadow-lg active:scale-[0.98] transition-transform"
          data-testid="button-open-scanner"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-lg font-bold">QR Skanerlash</p>
              <p className="text-sm opacity-80">Mijozning QR kodini tekshiring</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Bugun</span>
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <p className="text-2xl font-bold" data-testid="text-today-visitors">{todayVisits.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">tashrif</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Bugungi daromad</span>
                <div className="h-7 w-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600" data-testid="text-today-revenue">{formatCurrency(todayRevenue)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">so'm</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Shu oy</span>
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-violet-500" />
                </div>
              </div>
              <p className="text-2xl font-bold" data-testid="text-month-visitors">{thisMonthVisits.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{formatCurrency(thisMonthRevenue)} daromad</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Band slotlar</span>
                <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <p className="text-2xl font-bold" data-testid="text-occupancy">{occupancyPercent}%</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{totalOccupied}/{totalCapacity} joy</p>
            </CardContent>
          </Card>
        </div>

        {/* Balance Card */}
        <Card className="border-0 shadow-sm overflow-hidden" data-testid="card-your-earnings">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Joriy balans</p>
                <p className="text-3xl font-bold text-green-600" data-testid="text-your-earnings">{formatCurrency(currentBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">Jami: {formatCurrency(gym.totalEarnings)} • To'langan: {formatCurrency(totalPaid)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowTimeSlots(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-background hover:bg-muted/50 transition-colors shadow-sm"
            data-testid="button-manage-time-slots"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Vaqt slotlari</span>
            <Badge variant="secondary" className="text-xs">{timeSlots.length} ta</Badge>
          </button>
          <button
            onClick={() => setShowVisitors(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-background hover:bg-muted/50 transition-colors shadow-sm"
            data-testid="button-view-visitors"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Barcha tashriflar</span>
            <Badge variant="secondary" className="text-xs">{visits.length} ta</Badge>
          </button>
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

        {/* Payments */}
        <Card className="border-0 shadow-sm" data-testid="card-payments">
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

      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Kodni Skanerlang</DialogTitle>
            <DialogDescription>Mijozning QR kodini kameraga ko'rsating</DialogDescription>
          </DialogHeader>
          <div className="aspect-square overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/50">
            {showScanner && (
              <QRScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
              />
            )}
          </div>
          <Button variant="outline" onClick={() => setShowScanner(false)} className="w-full">
            Yopish
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scanResult} onOpenChange={(open) => !open && setScanResult(null)}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center text-center p-4">
            {scanResult?.success ? (
              <>
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">Muvaffaqiyatli!</h3>
                <p className="text-muted-foreground mb-6">{scanResult.message}</p>
                
                {scanResult.visitorName && (
                  <div className="flex flex-col items-center gap-2 mb-6">
                    <Avatar className="h-20 w-20 border-4 border-green-500 shadow-xl">
                      {scanResult.visitorProfileImage && (
                        <img src={scanResult.visitorProfileImage} alt={scanResult.visitorName} className="h-full w-full object-cover" />
                      )}
                      <AvatarFallback className="text-2xl">{scanResult.visitorName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-2xl text-foreground">{scanResult.visitorName}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Tashrif tasdiqlandi
                    </Badge>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <X className="h-12 w-12 text-destructive" />
                </div>
                <h3 className="text-2xl font-bold text-destructive mb-2">Xatolik!</h3>
                <p className="text-muted-foreground mb-6">{scanResult?.message}</p>
              </>
            )}
            <Button onClick={() => setScanResult(null)} className="w-full">
              Tushunarli
            </Button>
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

      <Dialog open={showTimeSlots} onOpenChange={setShowTimeSlots}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Vaqt slotlari
            </DialogTitle>
            <DialogDescription>Haftalik jadval boshqaruvi</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 border rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">
                Du-Sh, 09:00-21:00, har soatga 15 kishi. Dam kunlari zal sozlamalaridan aniqlanadi.
              </p>
              <Button
                onClick={handleOwnerAutoGenerate}
                disabled={isAutoGenerating}
                className="w-full"
                data-testid="button-owner-auto-generate"
              >
                {isAutoGenerating ? 'Yaratilmoqda...' : 'Avtomatik yaratish'}
              </Button>
            </div>

            {timeSlots.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Hali vaqt slotlari yo'q</p>
            ) : (
              <div className="space-y-3">
                {groupedSlots.filter(g => g.slots.length > 0).map(group => (
                  <div key={group.day}>
                    <h4 className="text-sm font-semibold mb-1.5">{group.day}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {group.slots.map(slot => (
                        <div key={slot.id} className="flex items-center justify-between w-full border rounded-md px-3 py-2 text-sm">
                          <span className="font-medium">{slot.startTime}-{slot.endTime}</span>
                          <div className="flex items-center gap-2">
                            {editingSlotId === slot.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  className="w-16 h-8 text-xs"
                                  value={editingCapacity}
                                  onChange={(e) => setEditingCapacity(e.target.value)}
                                  autoFocus
                                  data-testid={`input-owner-slot-capacity-${slot.id}`}
                                />
                                <Button
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => {
                                    const cap = parseInt(editingCapacity);
                                    if (cap > 0) updateCapacityMutation.mutate({ slotId: slot.id, capacity: cap });
                                  }}
                                  disabled={updateCapacityMutation.isPending}
                                  data-testid={`button-owner-save-capacity-${slot.id}`}
                                >
                                  OK
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={() => setEditingSlotId(null)}
                                  data-testid={`button-owner-cancel-capacity-${slot.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setEditingSlotId(slot.id);
                                    setEditingCapacity(slot.capacity.toString());
                                  }}
                                  data-testid={`badge-owner-slot-capacity-${slot.id}`}
                                >
                                  {slot.availableSpots}/{slot.capacity}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  data-testid={`button-owner-delete-slot-${slot.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
