import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Camera, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        title: "Muvaffaqiyatli",
        description: "Profil yangilandi",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
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
        <h1 className="font-display font-bold text-2xl">Profil</h1>
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
                {user?.name || "Foydalanuvchi"}
              </h2>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm" data-testid="text-user-phone">
                  📱 {user?.phone || "Telefon raqam yo'q"}
                </p>
                {(user as any)?.gender && (
                  <p className="text-muted-foreground text-sm" data-testid="text-user-gender">
                    {(user as any).gender === "Erkak" ? "👨 Erkak" : "👩 Ayol"}
                  </p>
                )}
                {(user as any)?.age && (
                  <p className="text-muted-foreground text-sm" data-testid="text-user-age">
                    🎂 {(user as any).age} yosh
                  </p>
                )}
              </div>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-edit-profile">
                  <Pencil className="h-4 w-4" />
                  Tahrirlash
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Profilni tahrirlash</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Ism</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ismingizni kiriting"
                      data-testid="input-edit-name"
                    />
                  </div>
                  <Button
                    onClick={handleSaveName}
                    disabled={updateProfileMutation.isPending}
                    className="w-full"
                    data-testid="button-save-name"
                  >
                    {updateProfileMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md mx-auto mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Kredit balansi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary" data-testid="text-credits">
            {user?.credits || 0} kredit
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
