import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Gym } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminGymsPage() {
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  const { data: gymsData, isLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Zallar Ro'yxati</h1>
        <p className="text-muted-foreground mt-2">Barcha sport zallar va ularning ma'lumotlari</p>
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
    </div>
  );
}
