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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Users, DollarSign, CreditCard, Edit, LogOut, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GymVisit, GymPayment } from "@shared/schema";

interface GymOwnerData {
  gym: {
    id: string;
    name: string;
    imageUrl?: string;
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
  const [editForm, setEditForm] = useState({ name: "", imageUrl: "" });
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const updateGymMutation = useMutation({
    mutationFn: async (updateData: { name?: string; imageUrl?: string }) => {
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
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    const updateData: { name?: string; imageUrl?: string } = {};
    if (editForm.name && editForm.name !== data?.gym.name) {
      updateData.name = editForm.name;
    }
    if (editForm.imageUrl && editForm.imageUrl !== data?.gym.imageUrl) {
      updateData.imageUrl = editForm.imageUrl;
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
            <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")} data-testid="button-back">
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

        <Card data-testid="card-visitors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tashriflar ({visits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {visits.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Hali tashriflar yo'q
              </div>
            ) : (
              <ScrollArea className="h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mehmon</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead className="text-right">Kredit</TableHead>
                      <TableHead className="text-right">Summa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((visit) => (
                      <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                        <TableCell className="font-medium">{visit.visitorName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(visit.visitDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{visit.creditsUsed}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          +{formatCurrency(visit.amountEarned)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

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
                    {payments.map((payment) => (
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
              <Label>Zal rasmi</Label>
              {editForm.imageUrl && (
                <img
                  src={editForm.imageUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                data-testid="input-edit-image"
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
    </div>
  );
}
