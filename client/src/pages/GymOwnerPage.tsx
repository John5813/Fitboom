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
import { Building2, Users, DollarSign, CreditCard, Edit, LogOut, ArrowLeft, Loader2, Eye, X, Clock, Trash2 } from "lucide-react";
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
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingCapacity, setEditingCapacity] = useState('');

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

  const gymId = localStorage.getItem("gymOwnerId");
  const accessCode = localStorage.getItem("gymOwnerCode");

  useEffect(() => {
    if (!gymId || !accessCode) {
      setLocation("/settings");
    }
  }, [gymId, accessCode, setLocation]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                localStorage.setItem("lastUserRole", "user");
                setLocation("/home");
              }} 
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold truncate" data-testid="text-gym-name">
              {gym.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEditDialog} data-testid="button-edit-gym">
              <Edit className="h-4 w-4 mr-1" />
              Tahrirlash
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card data-testid="card-gym-info">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {gym.imageUrl ? (
                <img
                  src={gym.imageUrl}
                  alt={gym.name}
                  className="w-24 h-24 rounded-md object-cover"
                  data-testid="img-gym"
                />
              ) : (
                <div className="w-24 h-24 rounded-md bg-muted flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold" data-testid="text-gym-title">
                  {gym.name}
                </h2>
                {gym.address && (
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-gym-address">
                    {gym.address}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-your-earnings">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Sizning daromadingiz</span>
            </div>
            <p className="text-xl font-bold text-green-600" data-testid="text-your-earnings">
              {formatCurrency(gym.totalEarnings - payments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              To'lovlar har oyning o'rtasida va oxirida amalga oshiriladi
            </p>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowTimeSlots(true)}
          data-testid="button-manage-time-slots"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>Vaqt slotlarini boshqarish</span>
          </div>
          <Badge variant="secondary">{timeSlots.length}</Badge>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowVisitors(true)}
          data-testid="button-view-visitors"
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Tashriflarni ko'rish</span>
          </div>
          <Badge variant="secondary">{visits.length}</Badge>
        </Button>

        <Card data-testid="card-payments">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              To'lovlar tarixi ({payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Hali to'lovlar yo'q
              </div>
            ) : (
              <ScrollArea className="h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead className="text-right">Summa</TableHead>
                      <TableHead>Izoh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map((payment) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(payment.paymentDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          +{formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
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
                Du-Sh, 09:00-21:00, har soatga 15 kishi. Yakshanba dam olish kuni.
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
    </div>
  );
}
