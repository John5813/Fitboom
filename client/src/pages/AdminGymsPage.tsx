import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Gym, TimeSlot } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, ArrowLeft, Clock, Trash2, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function AdminGymsPage() {
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTimeSlotDialogOpen, setIsTimeSlotDialogOpen] = useState(false);
  const [createdGym, setCreatedGym] = useState<Gym | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const { toast } = useToast();

  const [gymForm, setGymForm] = useState({
    name: '',
    address: '',
    description: '',
    credits: '',
    category: '',
    imageUrl: '',
    facilities: '',
    hours: '09:00 - 22:00',
    latitude: '',
    longitude: '',
  });

  const [timeSlotForm, setTimeSlotForm] = useState({
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    capacity: '',
  });

  const { data: gymsData, isLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const { data: timeSlotsData } = useQuery<{ timeSlots: TimeSlot[] }>({
    queryKey: ['/api/time-slots', selectedGym?.id],
    enabled: !!selectedGym?.id,
    queryFn: () => fetch(`/api/time-slots?gymId=${selectedGym?.id}`, { credentials: 'include' }).then(res => res.json()),
  });

  const gyms = gymsData?.gyms || [];
  const timeSlots = timeSlotsData?.timeSlots || [];

  const createGymMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/gyms', 'POST', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({
        title: "Zal qo'shildi",
        description: `${gymForm.name} muvaffaqiyatli qo'shildi.`,
      });
      setIsCreateDialogOpen(false);
      setCreatedGym(data.gym);
      setIsQRDialogOpen(true);
      setGymForm({
        name: '',
        address: '',
        description: '',
        credits: '',
        category: '',
        imageUrl: '',
        facilities: '',
        hours: '09:00 - 22:00',
        latitude: '',
        longitude: '',
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Zal qo'shishda xatolik yuz berdi.",
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

  const handleCreateGym = () => {
    if (!gymForm.name || !gymForm.address || !gymForm.credits || !gymForm.category) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring.",
        variant: "destructive"
      });
      return;
    }

    createGymMutation.mutate({
      ...gymForm,
      credits: parseInt(gymForm.credits)
    });
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

  const handleDeleteTimeSlot = (id: string) => {
    deleteTimeSlotMutation.mutate(id);
  };

  const handleCopyQRCode = (qrCode: string) => {
    navigator.clipboard.writeText(qrCode);
    toast({
      title: "Nusxalandi",
      description: "QR kod ma'lumoti clipboardga nusxalandi.",
    });
  };

  const handleDownloadQRCode = (qrCode: string, gymName: string) => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrCode)}`;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${gymName}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Yuklab olinmoqda",
      description: "QR kod rasm sifatida yuklab olinmoqda.",
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Orqaga
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">Zallar Ro'yxati</h1>
            <p className="text-muted-foreground mt-2">Barcha sport zallar va ularning ma'lumotlari</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-gym">
          <Plus className="h-4 w-4 mr-2" />
          Yangi Zal
        </Button>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Yuklanmoqda...</div>
        ) : gyms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Hozircha zallar yo'q
          </div>
        ) : (
          <ScrollArea className="h-[60vh] lg:h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 sticky top-0 bg-card z-10">№</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10">Zal Nomi</TableHead>
                  <TableHead className="w-24 sticky top-0 bg-card z-10">Harakatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gyms.map((gym, index) => (
                  <TableRow key={gym.id} data-testid={`row-gym-${gym.id}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-semibold" data-testid={`text-gym-name-${gym.id}`}>
                      {gym.name}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGym(gym)}
                        data-testid={`button-view-${gym.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      {/* Gym Detail Dialog */}
      <Dialog open={!!selectedGym} onOpenChange={(open) => !open && setSelectedGym(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-gym-detail">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {selectedGym?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedGym && (
            <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
              <div className="space-y-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kategoriya</p>
                  <p className="font-semibold">{selectedGym.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kredit</p>
                  <p className="font-semibold">{selectedGym.credits} kredit</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ish vaqti</p>
                  <p className="font-semibold">{selectedGym.hours}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Masofa</p>
                  <p className="font-semibold">{selectedGym.distance}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Manzil</p>
                <p className="font-semibold">{selectedGym.address}</p>
              </div>

              {selectedGym.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Tavsif</p>
                  <p className="text-sm">{selectedGym.description}</p>
                </div>
              )}

              {selectedGym.facilities && (
                <div>
                  <p className="text-sm text-muted-foreground">Imkoniyatlar</p>
                  <p className="text-sm">{selectedGym.facilities}</p>
                </div>
              )}

              {selectedGym.imageUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Rasm</p>
                  <img 
                    src={selectedGym.imageUrl} 
                    alt={selectedGym.name}
                    className="rounded-lg w-full h-48 object-cover"
                  />
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Vaqt slotlari</h3>
                  <Button
                    size="sm"
                    onClick={() => setIsTimeSlotDialogOpen(true)}
                    data-testid="button-add-time-slot"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Qo'shish
                  </Button>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTimeSlot(slot.id)}
                            data-testid={`button-delete-slot-${slot.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Time Slot Dialog */}
      <Dialog open={isTimeSlotDialogOpen} onOpenChange={setIsTimeSlotDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-create-time-slot">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Vaqt Sloti Qo'shish</DialogTitle>
            <DialogDescription>
              {selectedGym?.name} uchun yangi vaqt sloti yarating
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="dayOfWeek">Kun *</Label>
              <Select
                value={timeSlotForm.dayOfWeek}
                onValueChange={(value) => setTimeSlotForm({ ...timeSlotForm, dayOfWeek: value })}
              >
                <SelectTrigger id="dayOfWeek" data-testid="select-day-of-week">
                  <SelectValue placeholder="Kunni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dushanba">Dushanba</SelectItem>
                  <SelectItem value="Seshanba">Seshanba</SelectItem>
                  <SelectItem value="Chorshanba">Chorshanba</SelectItem>
                  <SelectItem value="Payshanba">Payshanba</SelectItem>
                  <SelectItem value="Juma">Juma</SelectItem>
                  <SelectItem value="Shanba">Shanba</SelectItem>
                  <SelectItem value="Yakshanba">Yakshanba</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Boshlanish vaqti *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={timeSlotForm.startTime}
                  onChange={(e) => setTimeSlotForm({ ...timeSlotForm, startTime: e.target.value })}
                  data-testid="input-start-time"
                />
              </div>
              <div>
                <Label htmlFor="endTime">Tugash vaqti *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={timeSlotForm.endTime}
                  onChange={(e) => setTimeSlotForm({ ...timeSlotForm, endTime: e.target.value })}
                  data-testid="input-end-time"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="capacity">Sig'im (kishi) *</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={timeSlotForm.capacity}
                onChange={(e) => setTimeSlotForm({ ...timeSlotForm, capacity: e.target.value })}
                placeholder="Misol: 20"
                data-testid="input-capacity"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateTimeSlot}
                disabled={createTimeSlotMutation.isPending}
                className="flex-1"
                data-testid="button-submit-time-slot"
              >
                {createTimeSlotMutation.isPending ? 'Yuklanmoqda...' : "Qo'shish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsTimeSlotDialogOpen(false)}
                className="flex-1"
                data-testid="button-cancel-time-slot"
              >
                Bekor qilish
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="category">Kategoriya *</Label>
                <Input
                  id="category"
                  value={gymForm.category}
                  onChange={(e) => setGymForm({ ...gymForm, category: e.target.value })}
                  placeholder="Misol: Fitnes, Yoga"
                  data-testid="input-gym-category"
                />
              </div>
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
              <Label htmlFor="address">Manzil *</Label>
              <Input
                id="address"
                value={gymForm.address}
                onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
                placeholder="Toshkent, Yunusobod tumani"
                data-testid="input-gym-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Kenglik (Latitude)</Label>
                <Input
                  id="latitude"
                  value={gymForm.latitude}
                  onChange={(e) => setGymForm({ ...gymForm, latitude: e.target.value })}
                  placeholder="41.311151"
                  data-testid="input-gym-latitude"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Uzunlik (Longitude)</Label>
                <Input
                  id="longitude"
                  value={gymForm.longitude}
                  onChange={(e) => setGymForm({ ...gymForm, longitude: e.target.value })}
                  placeholder="69.279737"
                  data-testid="input-gym-longitude"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="imageUrl">Rasm URL</Label>
              <Input
                id="imageUrl"
                value={gymForm.imageUrl}
                onChange={(e) => setGymForm({ ...gymForm, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="input-gym-image"
              />
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

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateGym}
                disabled={createGymMutation.isPending}
                className="flex-1"
                data-testid="button-submit-gym"
              >
                {createGymMutation.isPending ? 'Yuklanmoqda...' : "Qo'shish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
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
              <div className="flex justify-center bg-white p-6 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(createdGym.qrCode)}`}
                  alt="QR Code"
                  className="rounded-lg border-4 border-primary/20"
                  data-testid="img-qr-code"
                />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Bu QR kodni sport zalda joylashtiring. Foydalanuvchilar uni skanerlash orqali kirishi mumkin.
                </p>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-mono text-center break-all">
                    {createdGym.qrCode}
                  </p>
                </div>
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
    </div>
  );
}
