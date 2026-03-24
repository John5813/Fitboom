import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Gym, GymWithRating, TimeSlot } from "@shared/schema";
import { CATEGORIES, type Category } from "@shared/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, ArrowLeft, Clock, Trash2, Copy, Download, MapPin, X, DollarSign, CreditCard, History, TrendingUp, Building2, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import type { GymPayment } from "@shared/schema";

interface GymOwnerData {
  gym: {
    id: string;
    name: string;
    imageUrl?: string;
    address?: string;
    totalEarnings: number;
    currentDebt: number;
  };
  visits: Array<{
    id: string;
    visitorName: string;
    visitDate: string;
    creditsUsed: number;
    amountEarned: number;
  }>;
  payments: GymPayment[];
}

export default function AdminGymsPage() {
  const [, setLocation] = useLocation();
  const [selectedGym, setSelectedGym] = useState<GymWithRating | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTimeSlotDialogOpen, setIsTimeSlotDialogOpen] = useState(false);
  const [createdGym, setCreatedGym] = useState<Gym | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{ amount: number; gymName: string } | null>(null);
  const { toast } = useToast();

  const isVerified = sessionStorage.getItem('adminVerified') === 'true';
  useEffect(() => {
    if (!isVerified) setLocation('/admin');
  }, [isVerified]);

  const CLOSED_DAYS = [
    { value: "1", label: "Du" },
    { value: "2", label: "Se" },
    { value: "3", label: "Ch" },
    { value: "4", label: "Pa" },
    { value: "5", label: "Ju" },
    { value: "6", label: "Sh" },
    { value: "0", label: "Ya" },
  ];

  const [gymForm, setGymForm] = useState({
    name: '',
    address: '',
    description: '',
    credits: '',
    categories: [] as string[],
    imageUrl: '',
    images: [] as string[],
    facilities: '',
    hours: '09:00 - 22:00',
    locationLink: '',
    latitude: '',
    longitude: '',
    closedDays: [] as string[],
  });

  const [pendingSlots, setPendingSlots] = useState<Array<{ dayOfWeek: string; startTime: string; endTime: string; capacity: string }>>([]);
  const [newSlotForm, setNewSlotForm] = useState({ dayOfWeek: 'Dushanba', startTime: '09:00', endTime: '10:00', capacity: '15' });
  const [autoSlotForm, setAutoSlotForm] = useState({ startTime: '09:00', endTime: '21:00', capacity: '15' });
  const [autoSelectedDays, setAutoSelectedDays] = useState<string[]>([]);

  const [uploadingImages, setUploadingImages] = useState(false);

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      const res = await fetch("/api/upload-images", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.imageUrls) {
        const newImages = [...(gymForm.images || []), ...data.imageUrls];
        const newImageUrl = gymForm.imageUrl || data.imageUrls[0];
        setGymForm({
          ...gymForm,
          images: newImages,
          imageUrl: newImageUrl,
        });

        if (selectedGym) {
          try {
            await apiRequest(`/api/gyms/${selectedGym.id}`, 'PATCH', {
              images: newImages,
              imageUrl: newImageUrl,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
          } catch (saveError) {
            console.error("Auto-save images failed:", saveError);
          }
        }

        toast({
          title: "Muvaffaqiyatli",
          description: `${data.imageUrls.length} ta rasm yuklandi va saqlandi`,
        });
      }
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Rasmlarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const [timeSlotForm, setTimeSlotForm] = useState({
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    capacity: '',
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [bulkTimeSlot, setBulkTimeSlot] = useState({
    startTime: '09:00',
    endTime: '21:00',
    capacity: '15',
  });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingCapacity, setEditingCapacity] = useState('');
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const WEEKDAYS = [
    { short: 'Du', full: 'Dushanba' },
    { short: 'Se', full: 'Seshanba' },
    { short: 'Ch', full: 'Chorshanba' },
    { short: 'Pa', full: 'Payshanba' },
    { short: 'Ju', full: 'Juma' },
    { short: 'Sh', full: 'Shanba' },
    { short: 'Ya', full: 'Yakshanba' },
  ];

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const selectAllWeekdays = () => {
    setSelectedDays(['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma']);
  };

  const selectAllDays = () => {
    setSelectedDays(WEEKDAYS.map(d => d.full));
  };

  const clearDays = () => {
    setSelectedDays([]);
  };

  const { data: gymsData, isLoading } = useQuery<{ gyms: GymWithRating[] }>({
    queryKey: ['/api/gyms'],
  });

  const { data: timeSlotsData } = useQuery<{ timeSlots: TimeSlot[] }>({
    queryKey: ['/api/time-slots', selectedGym?.id],
    enabled: !!selectedGym?.id,
    queryFn: () => fetch(`/api/time-slots?gymId=${selectedGym?.id}`, { credentials: 'include' }).then(res => res.json()),
  });

  const { data: gymOwnerData } = useQuery<GymOwnerData>({
    queryKey: ['/api/gym-owner', selectedGym?.id],
    enabled: !!selectedGym?.id,
    queryFn: () => fetch(`/api/gym-owner/${selectedGym?.id}`, { credentials: 'include' }).then(res => res.json()),
  });

  const { data: gymRatingsData } = useQuery<{ ratings: { id: string; userId: string; bookingId: string; rating: number; createdAt: string }[] }>({
    queryKey: ['/api/gyms', selectedGym?.id, 'ratings-admin'],
    enabled: !!selectedGym?.id,
    queryFn: () => fetch(`/api/gyms/${selectedGym?.id}/ratings-admin`, { credentials: 'include' }).then(res => res.json()),
  });

  const gyms = gymsData?.gyms || [];
  const timeSlots = timeSlotsData?.timeSlots || [];
  const gymRatings = gymRatingsData?.ratings || [];

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { gymId: string; amount: number; notes: string }) => {
      const response = await apiRequest('/api/gym-payments', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gym-owner', selectedGym?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      setLastPaymentInfo({
        amount: parseInt(paymentAmount),
        gymName: selectedGym?.name || ''
      });
      toast({
        title: "To'lov qo'shildi",
        description: "To'lov muvaffaqiyatli qayd qilindi.",
      });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setTimeout(() => setLastPaymentInfo(null), 5000);
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "To'lovni qayd qilishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handleRecordPayment = () => {
    if (!paymentAmount || !selectedGym) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "To'lov miqdorini kiriting.",
        variant: "destructive"
      });
      return;
    }
    createPaymentMutation.mutate({
      gymId: selectedGym.id,
      amount: parseInt(paymentAmount),
      notes: paymentNotes
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
  };

  const toggleCategory = (categoryName: string) => {
    const categories = gymForm.categories || [];
    if (categories.includes(categoryName)) {
      setGymForm({
        ...gymForm,
        categories: categories.filter(c => c !== categoryName)
      });
    } else {
      setGymForm({
        ...gymForm,
        categories: [...categories, categoryName]
      });
    }
  };

  const createGymMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/gyms', 'POST', data);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      const gymId = data.gym?.id;
      if (gymId && pendingSlots.length > 0) {
        for (const slot of pendingSlots) {
          try {
            await apiRequest('/api/time-slots', 'POST', {
              gymId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              capacity: parseInt(slot.capacity),
            });
          } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['/api/time-slots', gymId] });
      }
      toast({
        title: "Zal qo'shildi",
        description: `${gymForm.name} muvaffaqiyatli qo'shildi${pendingSlots.length > 0 ? ` (${pendingSlots.length} ta slot ham yaratildi)` : ''}.`,
      });
      setIsCreateDialogOpen(false);
      setCreatedGym(data.gym);
      setIsQRDialogOpen(true);
      setPendingSlots([]);
      setNewSlotForm({ dayOfWeek: 'Dushanba', startTime: '09:00', endTime: '10:00', capacity: '15' });
      setAutoSelectedDays([]);
      setAutoSlotForm({ startTime: '09:00', endTime: '21:00', capacity: '15' });
      setGymForm({
        name: '',
        address: '',
        description: '',
        credits: '',
        categories: [],
        imageUrl: '',
        images: [],
        facilities: '',
        hours: '09:00 - 22:00',
        locationLink: '',
        latitude: '',
        longitude: '',
        closedDays: [],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Zal qo'shishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const createTimeSlotMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/time-slots', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots', selectedGym?.id] });
      toast({
        title: "Vaqt sloti qo'shildi",
        description: "Yangi vaqt sloti muvaffaqiyatli qo'shildi.",
      });
      setIsTimeSlotDialogOpen(false);
      setTimeSlotForm({
        dayOfWeek: '',
        startTime: '',
        endTime: '',
        capacity: '',
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Vaqt sloti qo'shishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const deleteTimeSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/time-slots/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots', selectedGym?.id] });
      toast({
        title: "Vaqt sloti o'chirildi",
        description: "Vaqt sloti muvaffaqiyatli o'chirildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Vaqt sloti o'chirishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const updateTimeSlotCapacityMutation = useMutation({
    mutationFn: async ({ id, capacity }: { id: string; capacity: number }) => {
      const response = await apiRequest(`/api/time-slots/${id}`, 'PUT', { capacity });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots', selectedGym?.id] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Sig'im yangilandi",
      });
      setEditingSlotId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Sig'imni yangilashda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  });

  const [isResolvingUrl, setIsResolvingUrl] = useState(false);

  const handleLocationLinkChange = async (link: string) => {
    setGymForm(prev => ({ ...prev, locationLink: link, address: link }));

    if (!link || link.length < 10) return;

    const localPatterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/
    ];
    for (const pattern of localPatterns) {
      const match = link.match(pattern);
      if (match) {
        setGymForm(prev => ({
          ...prev,
          locationLink: link,
          address: link,
          latitude: match[1],
          longitude: match[2]
        }));
        toast({
          title: "Koordinatalar topildi",
          description: `Lat: ${match[1]}, Lng: ${match[2]}`,
        });
        return;
      }
    }

    if (link.includes("maps.app.goo.gl") || link.includes("goo.gl") || link.includes("google.com/maps")) {
      setIsResolvingUrl(true);
      try {
        const res = await apiRequest("/api/resolve-maps-url", "POST", { url: link });
        const coords = await res.json();
        if (coords.latitude && coords.longitude) {
          setGymForm(prev => ({
            ...prev,
            locationLink: link,
            address: link,
            latitude: coords.latitude,
            longitude: coords.longitude
          }));
          toast({
            title: "Koordinatalar topildi",
            description: `Lat: ${coords.latitude}, Lng: ${coords.longitude}`,
          });
        }
      } catch {
        toast({
          title: "Koordinatalar topilmadi",
          description: "Havola noto'g'ri yoki server bilan bog'lanib bo'lmadi. To'liq Google Maps havolasini kiriting.",
          variant: "destructive"
        });
      } finally {
        setIsResolvingUrl(false);
      }
    }
  };

  const handleSaveEdit = () => {
    if (!selectedGym) return;
    
    const updateData: any = {
      name: gymForm.name,
      address: gymForm.address,
      description: gymForm.description,
      credits: parseInt(gymForm.credits),
      categories: gymForm.categories,
      imageUrl: gymForm.imageUrl,
      images: gymForm.images,
      facilities: gymForm.facilities,
      hours: gymForm.hours,
      latitude: gymForm.latitude,
      longitude: gymForm.longitude,
      closedDays: gymForm.closedDays,
    };

    updateGymMutation.mutate({ id: selectedGym.id, data: updateData });
  };

  const updateGymMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest(`/api/gyms/${id}`, 'PATCH', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({
        title: "Zal yangilandi",
        description: "Zal ma'lumotlari muvaffaqiyatli saqlandi.",
      });
      setSelectedGym(null);
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Zalni yangilashda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handleCreateGym = () => {
    if (!gymForm.name || !gymForm.address || !gymForm.credits || gymForm.categories.length === 0) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring va kamida bitta kategoriya tanlang.",
        variant: "destructive"
      });
      return;
    }

    const gymData: any = {
      ...gymForm,
      credits: parseInt(gymForm.credits),
      categories: gymForm.categories,
      imageUrl: gymForm.imageUrl || gymForm.images?.[0],
      closedDays: gymForm.closedDays,
    };

    createGymMutation.mutate(gymData);
  };

  const handleCreateTimeSlot = () => {
    if (!timeSlotForm.dayOfWeek || !timeSlotForm.startTime || !timeSlotForm.endTime || !timeSlotForm.capacity) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, barcha maydonlarni to'ldiring.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedGym) {
      toast({
        title: "Xatolik",
        description: "Zal tanlanmagan.",
        variant: "destructive"
      });
      return;
    }

    const capacity = parseInt(timeSlotForm.capacity);
    createTimeSlotMutation.mutate({
      gymId: selectedGym.id,
      dayOfWeek: timeSlotForm.dayOfWeek,
      startTime: timeSlotForm.startTime,
      endTime: timeSlotForm.endTime,
      capacity: capacity,
      availableSpots: capacity,
    });
  };

  const handleBulkCreateTimeSlots = async () => {
    if (selectedDays.length === 0) {
      toast({
        title: "Kun tanlanmagan",
        description: "Kamida bitta kunni tanlang.",
        variant: "destructive"
      });
      return;
    }

    if (!bulkTimeSlot.startTime || !bulkTimeSlot.endTime || !bulkTimeSlot.capacity) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Vaqt va sig'imni kiriting.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedGym) {
      toast({
        title: "Xatolik",
        description: "Zal tanlanmagan.",
        variant: "destructive"
      });
      return;
    }

    const capacity = parseInt(bulkTimeSlot.capacity);
    const startHour = parseInt(bulkTimeSlot.startTime.split(':')[0]);
    const endHour = parseInt(bulkTimeSlot.endTime.split(':')[0]);

    let totalSlots = 0;
    for (const day of selectedDays) {
      for (let h = startHour; h < endHour; h++) {
        const sTime = `${h.toString().padStart(2, '0')}:00`;
        const eTime = `${(h + 1).toString().padStart(2, '0')}:00`;
        await createTimeSlotMutation.mutateAsync({
          gymId: selectedGym.id,
          dayOfWeek: day,
          startTime: sTime,
          endTime: eTime,
          capacity: capacity,
          availableSpots: capacity,
        });
        totalSlots++;
      }
    }

    toast({
      title: "Vaqt slotlari qo'shildi",
      description: `${totalSlots} ta soatlik slot ${selectedDays.length} kun uchun yaratildi.`,
    });

    setSelectedDays([]);
    setIsTimeSlotDialogOpen(false);
  };

  const handleAutoGenerate = async () => {
    if (!selectedGym) {
      toast({
        title: "Xatolik",
        description: "Zal tanlanmagan.",
        variant: "destructive"
      });
      return;
    }

    setIsAutoGenerating(true);
    try {
      const response = await fetch('/api/time-slots/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gymId: selectedGym.id }),
      });
      const data = await response.json();
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/time-slots', selectedGym.id] });
        toast({
          title: "Muvaffaqiyatli",
          description: data.message || `${data.count} ta slot yaratildi`,
        });
        setIsTimeSlotDialogOpen(false);
      } else {
        toast({
          title: "Xatolik",
          description: data.error || "Slotlarni yaratishda xatolik",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Server bilan bog'lanishda xatolik",
        variant: "destructive"
      });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleDeleteTimeSlot = (id: string) => {
    deleteTimeSlotMutation.mutate(id);
  };

  const deleteGymMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/gyms/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({
        title: "Zal o'chirildi",
        description: "Zal muvaffaqiyatli o'chirildi.",
      });
      setSelectedGym(null);
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Zal o'chirishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteGym = (id: string) => {
    if (confirm("Haqiqatan ham bu zalni o'chirmoqchimisiz?")) {
      deleteGymMutation.mutate(id);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImages(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Rasm yuklashda xatolik');
      }

      const data = await response.json();
      setGymForm({ ...gymForm, imageUrl: data.imageUrl });

      toast({
        title: "Rasm yuklandi",
        description: "Rasm muvaffaqiyatli yuklandi",
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Rasm yuklashda xatolik yuz berdi",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleCopyQRCode = (qrCode: string) => {
    navigator.clipboard.writeText(qrCode);
    toast({
      title: "Nusxalandi",
      description: "QR kod ma'lumoti clipboardga nusxalandi.",
    });
  };

  const handleDownloadQRCode = async (qrCode: string, gymName: string) => {
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrCode)}`;

      // Fetch the image as a blob
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();

      // Create blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${gymName.replace(/\s+/g, '-')}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      toast({
        title: "Yuklab olindi",
        description: "QR kod muvaffaqiyatli yuklab olindi.",
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "QR kodni yuklab olishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  };

  if (!isVerified) return null;

  const totalEarnings = gyms.reduce((s, g) => s + (g.totalEarnings || 0), 0);
  const totalDebt = gyms.reduce((s, g) => s + (g.currentDebt || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-blue-200/70 hover:text-white hover:bg-white/10 h-9 w-9" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Zallar</h1>
                <p className="text-blue-200/60 text-sm">{gyms.length} ta sport zal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-200/70 hover:text-white hover:bg-white/10 hidden sm:flex"
                onClick={async () => {
                  try {
                    const res = await apiRequest("/api/fix-gym-coordinates", "POST", {});
                    const data = await res.json();
                    const fixed = data.results?.filter((r: any) => r.status === "fixed").length || 0;
                    toast({ title: "Koordinatalar yangilandi", description: `${fixed} ta zal koordinatalari topildi.` });
                    queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
                  } catch { toast({ title: "Xatolik", variant: "destructive" }); }
                }}
                data-testid="button-fix-coordinates"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Koordinata
              </Button>
              <Button size="sm" className="bg-white/15 hover:bg-white/25 text-white border-0" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-gym">
                <Plus className="h-4 w-4 mr-1" />
                Yangi Zal
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-3">
        {lastPaymentInfo && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-emerald-800 dark:text-emerald-200 text-sm font-medium">
              {lastPaymentInfo.gymName}: {new Intl.NumberFormat('uz-UZ').format(lastPaymentInfo.amount)} so'm qayd qilindi
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] text-muted-foreground">Zallar</span>
            </div>
            <p className="text-xl font-bold">{gyms.length}</p>
          </div>
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] text-muted-foreground">Daromad</span>
            </div>
            <p className="text-lg font-bold truncate">{formatCurrency(totalEarnings)}</p>
          </div>
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[11px] text-muted-foreground">Qarz</span>
            </div>
            <p className="text-lg font-bold truncate text-red-600 dark:text-red-400">{formatCurrency(totalDebt)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : gyms.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Hozircha zallar yo'q</p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Birinchi zalni qo'shing
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5 pb-6">
            {gyms.map((gym, index) => (
              <Card
                key={gym.id}
                data-testid={`row-gym-${gym.id}`}
                className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border overflow-hidden"
                onClick={() => {
                  setSelectedGym(gym);
                  setGymForm(prev => ({
                    ...prev,
                    name: gym.name || '',
                    address: gym.address || '',
                    locationLink: gym.address || '',
                    description: gym.description || '',
                    credits: String(gym.credits || ''),
                    categories: gym.categories || [],
                    imageUrl: gym.imageUrl || '',
                    images: gym.images || [],
                    facilities: gym.facilities || '',
                    hours: gym.hours || '',
                    latitude: gym.latitude || '',
                    longitude: gym.longitude || '',
                    closedDays: gym.closedDays || [],
                  }));
                }}
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate" data-testid={`text-gym-name-${gym.id}`}>{gym.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        {gym.avgRating != null && (
                          <span className="text-xs text-amber-500 font-medium" data-testid={`text-gym-rating-${gym.id}`}>
                            ⭐ {gym.avgRating.toFixed(1)} ({gym.ratingCount})
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{gym.credits} kr</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400" data-testid={`text-gym-earnings-${gym.id}`}>
                        {formatCurrency(gym.totalEarnings || 0)}
                      </p>
                      {(gym.currentDebt || 0) > 0 && (
                        <p className="text-xs text-red-500 font-medium mt-0.5" data-testid={`text-gym-debt-${gym.id}`}>
                          Qarz: {formatCurrency(gym.currentDebt || 0)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedGym} onOpenChange={(open) => !open && setSelectedGym(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0" data-testid="dialog-gym-detail">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">
                {selectedGym?.name}
              </DialogTitle>
              <DialogDescription className="text-blue-100/80">
                {selectedGym?.categories?.join(', ') || 'Sport zal'}
              </DialogDescription>
            </DialogHeader>
            {(selectedGym as any)?.ownerAccessCode && (
              <div className="mt-3 bg-white/15 backdrop-blur-sm rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-xs text-blue-100">Egasi paroli:</span>
                <span className="font-bold font-mono text-lg tracking-wider" data-testid="text-gym-owner-code">
                  {(selectedGym as any).ownerAccessCode}
                </span>
              </div>
            )}
          </div>

          {selectedGym && (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-5 p-5">

                <div className="space-y-3">
                  <div>
                    <Label>Zal nomi</Label>
                    <Input
                      value={gymForm.name}
                      onChange={(e) => setGymForm({...gymForm, name: e.target.value})}
                      data-testid="input-edit-gym-name"
                    />
                  </div>
                  <div>
                    <Label>Manzil (Google Maps havolasi)</Label>
                    <Input
                      value={gymForm.address}
                      onChange={(e) => handleLocationLinkChange(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      data-testid="input-edit-gym-address"
                    />
                    {isResolvingUrl && <p className="text-xs text-muted-foreground mt-1 animate-pulse">Koordinatalar aniqlanmoqda...</p>}
                    {gymForm.latitude && gymForm.longitude && (
                      <p className="text-xs text-green-600 mt-1">Lat: {gymForm.latitude}, Lng: {gymForm.longitude}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Kredit narxi</Label>
                      <Input
                        type="number"
                        value={gymForm.credits}
                        onChange={(e) => setGymForm({...gymForm, credits: e.target.value})}
                        data-testid="input-edit-gym-credits"
                      />
                    </div>
                    <div>
                      <Label>Ish vaqti</Label>
                      <Input
                        value={gymForm.hours}
                        onChange={(e) => setGymForm({...gymForm, hours: e.target.value})}
                        placeholder="09:00 - 22:00"
                        data-testid="input-edit-gym-hours"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Dam kunlari</Label>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {CLOSED_DAYS.map((d) => {
                        const isChecked = gymForm.closedDays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setGymForm(prev => ({
                              ...prev,
                              closedDays: isChecked
                                ? prev.closedDays.filter(v => v !== d.value)
                                : [...prev.closedDays, d.value]
                            }))}
                            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                              isChecked
                                ? 'bg-destructive text-destructive-foreground border-destructive'
                                : 'bg-background text-foreground border-border hover:bg-muted'
                            }`}
                            data-testid={`button-edit-closed-day-${d.value}`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    {gymForm.closedDays.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tanlangan dam kunlari brondan chiqariladi
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Tavsif</Label>
                    <Textarea
                      value={gymForm.description}
                      onChange={(e) => setGymForm({...gymForm, description: e.target.value})}
                      rows={2}
                      data-testid="input-edit-gym-description"
                    />
                  </div>
                  <div>
                    <Label>Imkoniyatlar</Label>
                    <Input
                      value={gymForm.facilities}
                      onChange={(e) => setGymForm({...gymForm, facilities: e.target.value})}
                      placeholder="Wi-Fi, Dush, Sauna..."
                      data-testid="input-edit-gym-facilities"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Kategoriyalar</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat: Category) => (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => toggleCategory(cat.name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            gymForm.categories?.includes(cat.name)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                          }`}
                          data-testid={`category-toggle-${cat.name}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveEdit}
                    disabled={updateGymMutation.isPending}
                    data-testid="button-save-gym-edit"
                  >
                    {updateGymMutation.isPending ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
                  </Button>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Manzil</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (selectedGym.latitude && selectedGym.longitude) {
                        window.open(`https://www.google.com/maps?q=${selectedGym.latitude},${selectedGym.longitude}`, '_blank');
                      } else if (selectedGym.address) {
                        window.open(selectedGym.address, '_blank');
                      }
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Haritada ko'rish
                  </Button>
                </div>

                <div>
                  <Label>Zal rasmlari</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {gymForm.images?.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-md overflow-hidden border group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setGymForm(prev => ({
                            ...prev,
                            images: prev.images.filter((_, idx) => idx !== i),
                            imageUrl: prev.imageUrl === url ? (prev.images.filter((_, idx) => idx !== i)[0] || "") : prev.imageUrl
                          }))}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {url === gymForm.imageUrl && (
                          <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-white text-center py-0.5">
                            Asosiy
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setGymForm(prev => ({ ...prev, imageUrl: url }))}
                          className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium"
                        >
                          Asosiy qilish
                        </button>
                      </div>
                    ))}
                    <label className="border-2 border-dashed rounded-md aspect-video flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Rasm qo'shish</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImagesUpload}
                        disabled={uploadingImages}
                      />
                    </label>
                  </div>
                  {uploadingImages && <p className="text-xs text-muted-foreground mt-1 animate-pulse">Yuklanmoqda...</p>}
                  <Button
                    className="w-full mt-2"
                    onClick={handleSaveEdit}
                    disabled={updateGymMutation.isPending}
                    data-testid="button-save-images"
                  >
                    {updateGymMutation.isPending ? 'Saqlanmoqda...' : 'Rasmlarni saqlash'}
                  </Button>
                </div>

              {selectedGym.qrCode && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">QR Kod</p>
                  <div className="bg-white p-4 rounded-lg border-2 border-primary/10">
                    <div className="flex justify-center mb-3">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedGym.qrCode)}`}
                        alt="QR Code"
                        className="rounded-lg border-4 border-primary/20"
                      />
                    </div>
                    <p className="text-xs font-mono break-all text-center mb-3 text-muted-foreground">
                      {selectedGym.qrCode}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleCopyQRCode(selectedGym.qrCode!)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Nusxalash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownloadQRCode(selectedGym.qrCode!, selectedGym.name)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Yuklab olish
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Moliyaviy Ma'lumotlar
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-card border p-3">
                    <p className="text-[11px] text-muted-foreground">Jami daromad</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedGym.totalEarnings || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-card border p-3">
                    <p className="text-[11px] text-muted-foreground">Joriy qarz</p>
                    <p className="text-base font-bold text-red-600 dark:text-red-400" data-testid="text-current-debt">
                      {formatCurrency(gymOwnerData?.gym?.currentDebt || selectedGym.currentDebt || 0)}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full" size="sm" data-testid="button-record-payment">
                  <CreditCard className="h-4 w-4 mr-2" />
                  To'lov Qayd Qilish
                </Button>
                {gymOwnerData?.payments && gymOwnerData.payments.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {[...gymOwnerData.payments]
                      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                      .slice(0, 5)
                      .map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center px-3 py-2 bg-card rounded-lg border text-xs">
                        <span className="text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString('uz-UZ')}</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Reytinglar
                  </h3>
                  {gymRatings.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {(gymRatings.reduce((s, r) => s + r.rating, 0) / gymRatings.length).toFixed(1)} ⭐ ({gymRatings.length})
                    </Badge>
                  )}
                </div>
                {gymRatings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Hozircha baho yo'q</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {[...gymRatings]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-card rounded-lg border text-xs" data-testid={`row-rating-${r.id}`}>
                          <span className="text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                          </span>
                          <span className="font-semibold text-amber-500">
                            {'⭐'.repeat(r.rating)} ({r.rating}/5)
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Vaqt slotlari</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteGym(selectedGym.id)}
                      data-testid="button-delete-gym"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Zalni o'chirish
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsTimeSlotDialogOpen(true)}
                      data-testid="button-add-time-slot"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Slot qo'shish
                    </Button>
                  </div>
                </div>

                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Vaqt slotlari yo'q
                  </p>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {timeSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          data-testid={`time-slot-${slot.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {slot.dayOfWeek} • {slot.startTime} - {slot.endTime}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {slot.availableSpots}/{slot.capacity} joy mavjud
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingSlotId === slot.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  className="w-16 h-8 text-xs"
                                  value={editingCapacity}
                                  onChange={(e) => setEditingCapacity(e.target.value)}
                                  autoFocus
                                  data-testid={`input-slot-capacity-${slot.id}`}
                                />
                                <Button
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => {
                                    const cap = parseInt(editingCapacity);
                                    if (cap > 0) updateTimeSlotCapacityMutation.mutate({ id: slot.id, capacity: cap });
                                  }}
                                  disabled={updateTimeSlotCapacityMutation.isPending}
                                  data-testid={`button-save-capacity-${slot.id}`}
                                >
                                  OK
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={() => setEditingSlotId(null)}
                                  data-testid={`button-cancel-capacity-${slot.id}`}
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
                                  data-testid={`badge-slot-capacity-${slot.id}`}
                                >
                                  Sig'im: {slot.capacity}
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteTimeSlot(slot.id)}
                                  data-testid={`button-delete-slot-${slot.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Time Slot Dialog - Simplified */}
      <Dialog open={isTimeSlotDialogOpen} onOpenChange={(open) => {
        setIsTimeSlotDialogOpen(open);
        if (!open) setSelectedDays([]);
      }}>
        <DialogContent className="max-w-md" data-testid="dialog-create-time-slot">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Vaqt Sloti Qo'shish</DialogTitle>
            <DialogDescription>
              {selectedGym?.name} uchun ish vaqtlarini belgilang
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="p-3 border rounded-md bg-muted/30">
              <p className="text-sm font-medium mb-2">Tez sozlash</p>
              <p className="text-xs text-muted-foreground mb-3">
                Du-Sh, 09:00-21:00, har soatga 15 kishi. Dam kunlari zal sozlamalaridan aniqlanadi.
              </p>
              <Button
                onClick={handleAutoGenerate}
                disabled={isAutoGenerating}
                className="w-full"
                data-testid="button-auto-generate-slots"
              >
                {isAutoGenerating ? 'Yaratilmoqda...' : 'Avtomatik yaratish (Du-Sh, 09:00-21:00)'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Yoki qo'lda sozlang</span>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Kunlarni tanlang</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {WEEKDAYS.map((day) => (
                  <div key={day.full} className="flex flex-col items-center gap-1">
                    <Button
                      type="button"
                      variant={selectedDays.includes(day.full) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.full)}
                      className="min-w-[48px]"
                      data-testid={`toggle-day-${day.short}`}
                    >
                      {day.short}
                    </Button>
                    
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAllWeekdays} className="text-xs" data-testid="button-select-weekdays">
                  Du-Ju
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDays(['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'])} className="text-xs" data-testid="button-select-workdays">
                  Du-Sh
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearDays} className="text-xs" data-testid="button-clear-days">
                  Tozalash
                </Button>
              </div>
              {selectedDays.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Tanlangan: {selectedDays.join(', ')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bulkStartTime">Boshlanish vaqti</Label>
                <Input
                  id="bulkStartTime"
                  type="time"
                  value={bulkTimeSlot.startTime}
                  onChange={(e) => setBulkTimeSlot({ ...bulkTimeSlot, startTime: e.target.value })}
                  data-testid="input-bulk-start-time"
                />
              </div>
              <div>
                <Label htmlFor="bulkEndTime">Tugash vaqti</Label>
                <Input
                  id="bulkEndTime"
                  type="time"
                  value={bulkTimeSlot.endTime}
                  onChange={(e) => setBulkTimeSlot({ ...bulkTimeSlot, endTime: e.target.value })}
                  data-testid="input-bulk-end-time"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bulkCapacity">Har bir soat uchun sig'im (kishi)</Label>
              <Input
                id="bulkCapacity"
                type="number"
                min="1"
                value={bulkTimeSlot.capacity}
                onChange={(e) => setBulkTimeSlot({ ...bulkTimeSlot, capacity: e.target.value })}
                placeholder="Misol: 15"
                data-testid="input-bulk-capacity"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleBulkCreateTimeSlots}
                disabled={createTimeSlotMutation.isPending || selectedDays.length === 0}
                className="flex-1"
                data-testid="button-submit-time-slots"
              >
                {createTimeSlotMutation.isPending ? 'Yuklanmoqda...' : `Soatlik slotlar yaratish`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsTimeSlotDialogOpen(false);
                  setSelectedDays([]);
                }}
                data-testid="button-cancel-time-slot"
              >
                Bekor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Gym Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-gym">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Yangi Zal Qo'shish</DialogTitle>
            <DialogDescription>
              Yangi sport zal ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Zal nomi *</Label>
              <Input
                id="name"
                value={gymForm.name}
                onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
                placeholder="Misol: FitZone Gym"
                data-testid="input-gym-name"
              />
            </div>

            <div>
              <Label>Kategoriyalar *</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {CATEGORIES.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Hozircha kategoriyalar yo'q</p>
                ) : (
                  CATEGORIES.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${category.id}`}
                        checked={gymForm.categories.includes(category.name)}
                        onCheckedChange={() => toggleCategory(category.name)}
                        data-testid={`checkbox-category-${category.name}`}
                      />
                      <label
                        htmlFor={`cat-${category.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.icon} {category.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {gymForm.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {gymForm.categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="credits">Kredit *</Label>
                <Input
                  id="credits"
                  type="number"
                  value={gymForm.credits}
                  onChange={(e) => setGymForm({ ...gymForm, credits: e.target.value })}
                  placeholder="2"
                  data-testid="input-gym-credits"
                />
              </div>
              <div>
                <Label htmlFor="hours">Ish vaqti</Label>
                <Input
                  id="hours"
                  value={gymForm.hours}
                  onChange={(e) => setGymForm({ ...gymForm, hours: e.target.value })}
                  placeholder="09:00 - 22:00"
                  data-testid="input-gym-hours"
                />
              </div>
            </div>

            <div>
              <Label>Dam kunlari</Label>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {CLOSED_DAYS.map((d) => {
                  const isChecked = gymForm.closedDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setGymForm(prev => ({
                        ...prev,
                        closedDays: isChecked
                          ? prev.closedDays.filter(v => v !== d.value)
                          : [...prev.closedDays, d.value]
                      }))}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        isChecked
                          ? 'bg-destructive text-destructive-foreground border-destructive'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      }`}
                      data-testid={`button-closed-day-${d.value}`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {gymForm.closedDays.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tanlangan dam kunlari brondan chiqariladi
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="locationLink">Joylashuv (Google Maps Link) *</Label>
              <Input
                id="locationLink"
                type="url"
                value={gymForm.locationLink}
                onChange={(e) => handleLocationLinkChange(e.target.value)}
                placeholder="https://maps.google.com/?q=41.311151,69.279737"
                data-testid="input-gym-location-link"
              />
              {isResolvingUrl && (
                <p className="text-xs text-primary mt-1">Koordinatalar aniqlanmoqda...</p>
              )}
              {gymForm.latitude && gymForm.longitude && (
                <p className="text-xs text-green-600 mt-1">
                  Koordinatalar topildi: {gymForm.latitude}, {gymForm.longitude}
                </p>
              )}
              {!isResolvingUrl && !gymForm.latitude && gymForm.locationLink && gymForm.locationLink.length > 10 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Google Maps dan link kiriting (qisqartirilgan yoki to'liq havola)
                </p>
              )}
              {!gymForm.locationLink && (
                <p className="text-xs text-muted-foreground mt-1">
                  Google Maps dan link kiritsangiz, koordinatalar avtomatik ajratib olinadi
                </p>
              )}
            </div>

            <div>
              <Label>Zal rasmlari</Label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {gymForm.images?.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGymForm(prev => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== idx),
                        imageUrl: prev.imageUrl === prev.images[idx] ? (prev.images.filter((_, i) => i !== idx)[0] || "") : prev.imageUrl
                      }))}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {img === gymForm.imageUrl && (
                      <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-white text-center py-0.5">
                        Asosiy
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setGymForm(prev => ({ ...prev, imageUrl: img }))}
                      className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium"
                    >
                      Asosiy qilish
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Input
                  id="imageFile"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImagesUpload}
                  disabled={uploadingImages}
                  data-testid="input-gym-images"
                />
                {uploadingImages && (
                  <p className="text-sm text-muted-foreground animate-pulse">Yuklanmoqda...</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Tavsif</Label>
              <Textarea
                id="description"
                value={gymForm.description}
                onChange={(e) => setGymForm({ ...gymForm, description: e.target.value })}
                placeholder="Zal haqida qisqacha ma'lumot..."
                rows={3}
                data-testid="input-gym-description"
              />
            </div>

            <div>
              <Label htmlFor="facilities">Imkoniyatlar</Label>
              <Textarea
                id="facilities"
                value={gymForm.facilities}
                onChange={(e) => setGymForm({ ...gymForm, facilities: e.target.value })}
                placeholder="Dush, Garderob, Wi-Fi, ..."
                rows={2}
                data-testid="input-gym-facilities"
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Vaqt slotlari</Label>
                {pendingSlots.length > 0 && (
                  <Badge variant="secondary">{pendingSlots.length} ta slot</Badge>
                )}
              </div>

              {/* Auto-generate section */}
              <div className="bg-muted/50 rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avtomatik to'ldirish</p>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.full}
                      type="button"
                      onClick={() => setAutoSelectedDays(prev =>
                        prev.includes(d.full) ? prev.filter(x => x !== d.full) : [...prev, d.full]
                      )}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                        autoSelectedDays.includes(d.full)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      }`}
                      data-testid={`button-auto-day-${d.short}`}
                    >
                      {d.short}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAutoSelectedDays(WEEKDAYS.slice(0, 5).map(d => d.full))}
                    className="px-2 py-1 rounded text-xs border border-dashed border-border hover:bg-muted transition-colors"
                    data-testid="button-auto-select-weekdays"
                  >
                    Du–Ju
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoSelectedDays(WEEKDAYS.map(d => d.full))}
                    className="px-2 py-1 rounded text-xs border border-dashed border-border hover:bg-muted transition-colors"
                    data-testid="button-auto-select-all"
                  >
                    Hammasi
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Boshlanish</Label>
                    <Input
                      type="time"
                      value={autoSlotForm.startTime}
                      onChange={(e) => setAutoSlotForm(prev => ({ ...prev, startTime: e.target.value }))}
                      className="h-8 text-sm"
                      data-testid="input-auto-start"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tugash</Label>
                    <Input
                      type="time"
                      value={autoSlotForm.endTime}
                      onChange={(e) => setAutoSlotForm(prev => ({ ...prev, endTime: e.target.value }))}
                      className="h-8 text-sm"
                      data-testid="input-auto-end"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sig'im</Label>
                    <Input
                      type="number"
                      min="1"
                      value={autoSlotForm.capacity}
                      onChange={(e) => setAutoSlotForm(prev => ({ ...prev, capacity: e.target.value }))}
                      className="h-8 text-sm"
                      placeholder="15"
                      data-testid="input-auto-capacity"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={autoSelectedDays.length === 0}
                  data-testid="button-auto-fill-slots"
                  onClick={() => {
                    const startH = parseInt(autoSlotForm.startTime.split(':')[0]);
                    const endH = parseInt(autoSlotForm.endTime.split(':')[0]);
                    if (startH >= endH || !autoSlotForm.capacity) return;
                    const generated: Array<{ dayOfWeek: string; startTime: string; endTime: string; capacity: string }> = [];
                    for (const day of autoSelectedDays) {
                      for (let h = startH; h < endH; h++) {
                        generated.push({
                          dayOfWeek: day,
                          startTime: `${h.toString().padStart(2, '0')}:00`,
                          endTime: `${(h + 1).toString().padStart(2, '0')}:00`,
                          capacity: autoSlotForm.capacity,
                        });
                      }
                    }
                    setPendingSlots(prev => [...prev, ...generated]);
                  }}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {autoSelectedDays.length > 0
                    ? `${autoSelectedDays.length} kun × ${Math.max(0, parseInt(autoSlotForm.endTime) - parseInt(autoSlotForm.startTime))} soat = ${autoSelectedDays.length * Math.max(0, parseInt(autoSlotForm.endTime.split(':')[0]) - parseInt(autoSlotForm.startTime.split(':')[0]))} slot yaratish`
                    : 'Kunlarni tanlang'}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 border-t" />
                <span>yoki qo'lda qo'shing</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Manual entry */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Kun</Label>
                    <Select
                      value={newSlotForm.dayOfWeek}
                      onValueChange={(v) => setNewSlotForm(prev => ({ ...prev, dayOfWeek: v }))}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid="select-slot-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((d) => (
                          <SelectItem key={d.full} value={d.full}>{d.full}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Sig'im</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newSlotForm.capacity}
                      onChange={(e) => setNewSlotForm(prev => ({ ...prev, capacity: e.target.value }))}
                      className="h-8 text-sm"
                      placeholder="15"
                      data-testid="input-slot-capacity"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Boshlanish</Label>
                    <Input
                      type="time"
                      value={newSlotForm.startTime}
                      onChange={(e) => setNewSlotForm(prev => ({ ...prev, startTime: e.target.value }))}
                      className="h-8 text-sm"
                      data-testid="input-slot-start"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tugash</Label>
                    <Input
                      type="time"
                      value={newSlotForm.endTime}
                      onChange={(e) => setNewSlotForm(prev => ({ ...prev, endTime: e.target.value }))}
                      className="h-8 text-sm"
                      data-testid="input-slot-end"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  data-testid="button-add-slot"
                  onClick={() => {
                    if (!newSlotForm.startTime || !newSlotForm.endTime || !newSlotForm.capacity) return;
                    setPendingSlots(prev => [...prev, { ...newSlotForm }]);
                    setNewSlotForm(prev => ({
                      ...prev,
                      startTime: newSlotForm.endTime,
                      endTime: newSlotForm.endTime.replace(/(\d+):(\d+)/, (_, h, m) => `${String((parseInt(h) + 1) % 24).padStart(2, '0')}:${m}`),
                    }));
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Slot qo'shish
                </Button>
              </div>

              {/* Pending slots list */}
              {pendingSlots.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Qo'shilgan slotlar:</p>
                    <button
                      type="button"
                      onClick={() => setPendingSlots([])}
                      className="text-xs text-destructive hover:underline"
                      data-testid="button-clear-slots"
                    >
                      Barchasini o'chirish
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {pendingSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted rounded px-2 py-1 text-xs">
                        <span className="font-medium w-24 truncate">{slot.dayOfWeek}</span>
                        <span className="text-muted-foreground">{slot.startTime} – {slot.endTime}</span>
                        <span>{slot.capacity} kishi</span>
                        <button
                          type="button"
                          onClick={() => setPendingSlots(prev => prev.filter((_, i) => i !== idx))}
                          className="text-destructive hover:text-destructive/80 ml-1"
                          data-testid={`button-remove-slot-${idx}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreateGym}
                disabled={createGymMutation.isPending || isResolvingUrl}
                className="flex-1"
                data-testid="button-submit-gym"
              >
                {createGymMutation.isPending ? 'Yuklanmoqda...' : isResolvingUrl ? 'Koordinatalar aniqlanmoqda...' : "Qo'shish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsCreateDialogOpen(false); setPendingSlots([]); setNewSlotForm({ dayOfWeek: 'Dushanba', startTime: '09:00', endTime: '10:00', capacity: '15' }); setAutoSelectedDays([]); setAutoSlotForm({ startTime: '09:00', endTime: '21:00', capacity: '15' }); }}
                className="flex-1"
                data-testid="button-cancel-gym"
              >
                Bekor qilish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">QR Kod Yaratildi</DialogTitle>
            <DialogDescription>
              {createdGym?.name} uchun QR kod muvaffaqiyatli yaratildi
            </DialogDescription>
          </DialogHeader>

          {createdGym && createdGym.qrCode && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Zal egasi paroli:</p>
                <p className="text-2xl font-bold font-mono text-center" data-testid="text-owner-access-code">
                  {(createdGym as any).ownerAccessCode || 'Kod yo\'q'}
                </p>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Bu parolni zal egasiga bering. U bu parol orqali o'z sahifasiga kiradi.
                </p>
              </div>

              <div className="flex justify-center bg-white p-4 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(createdGym.qrCode)}`}
                  alt="QR Code"
                  className="rounded-lg"
                  data-testid="img-qr-code"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleCopyQRCode(createdGym.qrCode!)}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-copy-qr"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Nusxalash
                </Button>
                <Button
                  onClick={() => handleDownloadQRCode(createdGym.qrCode!, createdGym.name)}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-download-qr"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Yuklab olish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-record-payment">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">To'lov Qayd Qilish</DialogTitle>
            <DialogDescription>
              {selectedGym?.name} uchun to'lov ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Joriy Qarz</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(gymOwnerData?.gym?.currentDebt || selectedGym?.currentDebt || 0)}
              </p>
            </div>

            <div>
              <Label htmlFor="paymentAmount">To'lov Miqdori (so'm) *</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Misol: 500000"
                data-testid="input-payment-amount"
              />
            </div>

            <div>
              <Label htmlFor="paymentNotes">Izoh</Label>
              <Input
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ixtiyoriy izoh..."
                data-testid="input-payment-notes"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleRecordPayment}
                disabled={createPaymentMutation.isPending}
                className="flex-1"
                data-testid="button-submit-payment"
              >
                {createPaymentMutation.isPending ? 'Yuklanmoqda...' : "To'lov Qayd Qilish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setPaymentAmount('');
                  setPaymentNotes('');
                }}
                className="flex-1"
                data-testid="button-cancel-payment"
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