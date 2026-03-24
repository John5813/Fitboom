import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Video, MessageSquare, Key, Trash2, Check, X, Users, Lock, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PartnershipMessage {
  id: string;
  hallName: string;
  phone: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVerified, setIsVerified] = useState(() => sessionStorage.getItem('adminVerified') === 'true');
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const verifyGateMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Parol noto'g'ri");
      }
      return res.json();
    },
    onSuccess: () => {
      sessionStorage.setItem('adminVerified', 'true');
      setIsVerified(true);
      setGateError("");
    },
    onError: (error: Error) => {
      setGateError(error.message || "Parol noto'g'ri");
    },
  });

  const { data: messagesData } = useQuery<{ messages: PartnershipMessage[] }>({
    queryKey: ['/api/admin/partnership-messages'],
  });
  const messages = messagesData?.messages || [];
  const pendingCount = messages.filter(m => m.status === 'pending').length;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/partnership-messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Xatolik');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partnership-messages'] });
      toast({ title: "Muvaffaqiyatli", description: "Status yangilandi" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/partnership-messages/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Xatolik');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partnership-messages'] });
      toast({ title: "Muvaffaqiyatli", description: "Xabar o'chirildi" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
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
      toast({ title: "Muvaffaqiyatli", description: "Parol o'zgartirildi" });
      setIsPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="p-4 bg-primary/10 rounded-full">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Admin Panel</CardTitle>
            <CardDescription>Kirish uchun admin parolini kiriting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Parol"
                  className="pl-9"
                  value={gatePassword}
                  onChange={(e) => { setGatePassword(e.target.value); setGateError(""); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') verifyGateMutation.mutate(gatePassword); }}
                  data-testid="input-admin-password"
                  autoFocus
                />
              </div>
              {gateError && (
                <p className="text-sm text-destructive text-center" data-testid="text-gate-error">{gateError}</p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => verifyGateMutation.mutate(gatePassword)}
              disabled={verifyGateMutation.isPending || !gatePassword}
              data-testid="button-admin-login"
            >
              {verifyGateMutation.isPending ? "Tekshirilmoqda..." : "Kirish"}
            </Button>
            <div className="text-center">
              <Link href="/home">
                <Button variant="ghost" size="sm" data-testid="button-back-from-gate">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Orqaga
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/home">
            <Button 
              variant="ghost" 
              size="sm" 
              data-testid="button-back"
              onClick={() => localStorage.setItem("lastUserRole", "user")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Mijoz bo'limiga qaytish
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Tizimni boshqarish</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gyms Management */}
          <Card className="hover-elevate cursor-pointer" data-testid="card-gyms">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Zallar</CardTitle>
                  <CardDescription>Sport zallarni boshqarish</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Barcha sport zallarni ko'rish, tahrirlash va yangilarini qo'shish
              </p>
              <Link href="/admin/gyms">
                <Button className="w-full" data-testid="button-manage-gyms">
                  Zallar Ro'yxati
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Video Collections Management */}
          <Card className="hover-elevate cursor-pointer" data-testid="card-collections">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Video To'plamlar</CardTitle>
                  <CardDescription>Darslik to'plamlarni boshqarish</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Video darslik to'plamlarini yaratish va boshqarish
              </p>
              <Link href="/admin/collections">
                <Button className="w-full" data-testid="button-manage-collections">
                  To'plamlar Ro'yxati
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="hover-elevate cursor-pointer" onClick={() => setIsMessagesOpen(true)} data-testid="card-messages">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg relative">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                  {pendingCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </div>
                <div>
                  <CardTitle>Xabarlar</CardTitle>
                  <CardDescription>Hamkorlik so'rovlari</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Hamkor bo'lishni xohlovchilarning so'rovlari
              </p>
              <Button className="w-full" data-testid="button-view-messages">
                Xabarlarni ko'rish
              </Button>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card className="hover-elevate cursor-pointer" onClick={() => setIsPasswordOpen(true)} data-testid="card-password">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Key className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Parol</CardTitle>
                  <CardDescription>Admin parolini o'zgartirish</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Kirish parolini yangilash
              </p>
              <Button className="w-full" data-testid="button-change-password">
                Parolni o'zgartirish
              </Button>
            </CardContent>
          </Card>

          {/* Users Management */}
          <Card className="hover-elevate cursor-pointer" data-testid="card-users">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Foydalanuvchilar</CardTitle>
                  <CardDescription>Barcha foydalanuvchilar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Foydalanuvchilarni ko'rish va kredit muddatini kuzatish
              </p>
              <Link href="/admin/users">
                <Button className="w-full" data-testid="button-manage-users">
                  Foydalanuvchilar Ro'yxati
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Messages Dialog */}
      <Dialog open={isMessagesOpen} onOpenChange={setIsMessagesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hamkorlik so'rovlari</DialogTitle>
            <DialogDescription>Hamkor bo'lishni xohlovchilarning so'rovlari</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Hozircha so'rovlar yo'q</p>
            ) : (
              messages.map((msg) => (
                <Card key={msg.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{msg.hallName}</h4>
                      <p className="text-sm text-muted-foreground">{msg.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.createdAt).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={msg.status === 'pending' ? 'default' : msg.status === 'approved' ? 'secondary' : 'outline'}>
                        {msg.status === 'pending' ? 'Kutilmoqda' : msg.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                      </Badge>
                      {msg.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'approved' })}
                            data-testid={`button-approve-${msg.id}`}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'rejected' })}
                            data-testid={`button-reject-${msg.id}`}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMessageMutation.mutate(msg.id)}
                        data-testid={`button-delete-${msg.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parolni o'zgartirish</DialogTitle>
            <DialogDescription>Yangi admin parolini kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Joriy parol</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Joriy parolni kiriting"
                data-testid="input-current-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Yangi parol</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yangi parolni kiriting"
                data-testid="input-new-password"
              />
            </div>
            <Button
              onClick={() => changePasswordMutation.mutate({ currentPassword, newPassword })}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
              className="w-full"
              data-testid="button-save-password"
            >
              {changePasswordMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
