import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Gym } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Plus, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function AdminGymsPage() {
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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
  });

  const { data: gymsData, isLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  const createGymMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/gyms', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({
        title: "Zal qo'shildi",
        description: `${gymForm.name} muvaffaqiyatli qo'shildi.`,
      });
      setIsCreateDialogOpen(false);
      setGymForm({
        name: '',
        address: '',
        description: '',
        credits: '',
        category: '',
        imageUrl: '',
        facilities: '',
        hours: '09:00 - 22:00',
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">№</TableHead>
                <TableHead>Zal Nomi</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead>Kredit</TableHead>
                <TableHead className="w-24">Harakatlar</TableHead>
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
                    <Badge variant="outline">{gym.category}</Badge>
                  </TableCell>
                  <TableCell>{gym.credits} kredit</TableCell>
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
        )}
      </Card>

      {/* Gym Detail Dialog */}
      <Dialog open={!!selectedGym} onOpenChange={(open) => !open && setSelectedGym(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-gym-detail">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {selectedGym?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedGym && (
            <div className="space-y-4">
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
            </div>
          )}
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
    </div>
  );
}
