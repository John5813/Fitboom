import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building2, Video, MessageSquare, Key, Trash2, Check, X, Users,
  Lock, ShieldCheck, TrendingUp, ChevronRight, Settings, LayoutDashboard, Eye, BarChart3
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Gym } from "@shared/schema";

interface PartnershipMessage {
  id: string;
  hallName: string;
  phone: string;
  status: string;
  createdAt: string;
}

interface UserData {
  id: string;
  credits: number;
  isAdmin: boolean;
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
    enabled: isVerified,
  });
  const messages = messagesData?.messages || [];
  const pendingCount = messages.filter(m => m.status === 'pending').length;

  const { data: gymsData } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
    enabled: isVerified,
  });
  const gyms = gymsData?.gyms || [];

  const { data: usersData } = useQuery<{ users: UserData[] }>({
    queryKey: ['/api/admin/users'],
    enabled: isVerified,
  });
  const usersList = usersData?.users || [];
  const totalCredits = usersList.reduce((s, u) => s + (u.credits || 0), 0);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
              <ShieldCheck className="h-10 w-10 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Admin Panel</h1>
            <p className="text-blue-200/70 text-sm">Kirish uchun parolni kiriting</p>
          </div>
          <Card className="border-0 shadow-2xl shadow-black/20">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Admin parol"
                    className="pl-9 h-11"
                    value={gatePassword}
                    onChange={(e) => { setGatePassword(e.target.value); setGateError(""); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && gatePassword) verifyGateMutation.mutate(gatePassword); }}
                    data-testid="input-admin-password"
                    autoFocus
                  />
                </div>
                {gateError && (
                  <p className="text-sm text-destructive text-center" data-testid="text-gate-error">{gateError}</p>
                )}
              </div>
              <Button
                className="w-full h-11"
                onClick={() => verifyGateMutation.mutate(gatePassword)}
                disabled={verifyGateMutation.isPending || !gatePassword}
                data-testid="button-admin-login"
              >
                {verifyGateMutation.isPending ? "Tekshirilmoqda..." : "Kirish"}
              </Button>
            </CardContent>
          </Card>
          <div className="text-center mt-4">
            <Link href="/home">
              <Button variant="ghost" size="sm" className="text-blue-200/70 hover:text-white hover:bg-white/10" data-testid="button-back-from-gate">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Orqaga
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Zallar", value: gyms.length, icon: Building2, color: "from-blue-500 to-cyan-500" },
    { label: "Foydalanuvchilar", value: usersList.length, icon: Users, color: "from-violet-500 to-purple-500" },
    { label: "Jami kreditlar", value: totalCredits, icon: TrendingUp, color: "from-emerald-500 to-green-500" },
    { label: "So'rovlar", value: pendingCount, icon: MessageSquare, color: "from-amber-500 to-orange-500" },
  ];

  const navItems = [
    {
      title: "Zallar",
      desc: "Sport zallarni boshqarish",
      icon: Building2,
      href: "/admin/gyms",
      count: gyms.length,
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Video To'plamlar",
      desc: "Darslik to'plamlarni boshqarish",
      icon: Video,
      href: "/admin/collections",
      gradient: "from-violet-500/10 to-purple-500/10",
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
    },
    {
      title: "Foydalanuvchilar",
      desc: "Barcha foydalanuvchilar ro'yxati",
      icon: Users,
      href: "/admin/users",
      count: usersList.length,
      gradient: "from-emerald-500/10 to-green-500/10",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: "Analitika",
      desc: "Biznes ko'rsatkichlari va moliya",
      icon: BarChart3,
      href: "/admin/analytics",
      gradient: "from-orange-500/10 to-red-500/10",
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/icon-192.png"
                alt="FitBoom"
                className="h-12 w-12 rounded-xl shadow-lg"
                data-testid="img-logo"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
                <p className="text-blue-200/60 text-sm">FitBoom boshqaruv tizimi</p>
              </div>
            </div>
            <Link href="/home">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-200/70 hover:text-white hover:bg-white/10"
                data-testid="button-back"
                onClick={() => localStorage.setItem("lastUserRole", "user")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Mijoz bo'limiga</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl bg-card border shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold" data-testid={`stat-${s.label}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Boshqaruv</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {navItems.map((item) => (
            <Link key={item.title} href={item.href}>
              <Card className={`group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br ${item.gradient} border`} data-testid={`card-nav-${item.title}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${item.iconBg}`}>
                      <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                    </div>
                    {item.count !== undefined && (
                      <Badge variant="secondary" className="font-mono">{item.count}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
                  <div className="flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
                    <span>Boshqarish</span>
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <Card
            className="group cursor-pointer transition-all duration-200 hover:shadow-md border"
            onClick={() => setIsMessagesOpen(true)}
            data-testid="card-messages"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 relative">
                    <MessageSquare className="h-5 w-5 text-amber-600" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">{pendingCount}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">Hamkorlik so'rovlari</h3>
                    <p className="text-sm text-muted-foreground">{messages.length} ta so'rov</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer transition-all duration-200 hover:shadow-md border"
            onClick={() => setIsPasswordOpen(true)}
            data-testid="card-password"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Parol sozlamalari</h3>
                    <p className="text-sm text-muted-foreground">Admin parolini o'zgartirish</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isMessagesOpen} onOpenChange={setIsMessagesOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              Hamkorlik so'rovlari
            </DialogTitle>
            <DialogDescription>Hamkor bo'lishni xohlovchilarning so'rovlari</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pt-2">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Hozircha so'rovlar yo'q</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="p-4 rounded-xl bg-muted/50 border space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold truncate">{msg.hallName}</h4>
                      <p className="text-sm text-muted-foreground">{msg.phone}</p>
                    </div>
                    <Badge variant={msg.status === 'pending' ? 'default' : msg.status === 'approved' ? 'secondary' : 'outline'} className="shrink-0">
                      {msg.status === 'pending' ? 'Kutilmoqda' : msg.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString('uz-UZ')}</span>
                    <div className="flex items-center gap-1">
                      {msg.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30" onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'approved' })} data-testid={`button-approve-${msg.id}`}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'rejected' })} data-testid={`button-reject-${msg.id}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteMessageMutation.mutate(msg.id)} data-testid={`button-delete-${msg.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              Parolni o'zgartirish
            </DialogTitle>
            <DialogDescription>Yangi admin parolini kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Joriy parol</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Joriy parolni kiriting" data-testid="input-current-password" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Yangi parol</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Yangi parolni kiriting" data-testid="input-new-password" />
            </div>
            <Button onClick={() => changePasswordMutation.mutate({ currentPassword, newPassword })} disabled={changePasswordMutation.isPending || !currentPassword || !newPassword} className="w-full" data-testid="button-save-password">
              {changePasswordMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
