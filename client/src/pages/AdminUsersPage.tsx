import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Search, CreditCard, Calendar, User, Users, TrendingUp,
  AlertTriangle, Clock, ShieldCheck, Phone, MessageCircle, Plus, Minus,
  Edit3, Check, X, History, ShoppingBag, Dumbbell
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserData {
  id: string;
  name: string | null;
  phone: string | null;
  telegramId: string | null;
  chatId: string | null;
  credits: number;
  creditExpiryDate: string | null;
  isAdmin: boolean;
  profileCompleted: boolean;
  createdAt?: string;
}

interface Booking {
  id: string;
  gymId: string;
  gymName?: string;
  status: string;
  bookingDate: string;
  creditsUsed?: number;
}

interface Purchase {
  id: string;
  packageName?: string;
  creditsAdded?: number;
  amount?: number;
  createdAt: string;
}

interface UserDetail {
  user: UserData;
  bookings: Booking[];
  purchases: Purchase[];
}

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [creditMode, setCreditMode] = useState<"add" | "remove" | "set">("add");
  const [creditAmount, setCreditAmount] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVerified = sessionStorage.getItem('adminVerified') === 'true';

  useEffect(() => {
    if (!isVerified) setLocation('/admin');
  }, [isVerified]);

  const { data: usersData, isLoading, error, isError } = useQuery<{ users: UserData[] }>({
    queryKey: ['/api/admin/users'],
    enabled: isVerified,
  });

  const { data: userDetail, isLoading: isDetailLoading } = useQuery<UserDetail>({
    queryKey: ['/api/admin/users', selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: () => fetch(`/api/admin/users/${selectedUser!.id}`, { credentials: 'include' }).then(r => r.json()),
  });

  const adjustCreditsMutation = useMutation({
    mutationFn: async (data: { amount: number; type: string; expiryDays?: number }) => {
      const res = await apiRequest(`/api/admin/users/${selectedUser!.id}/adjust-credits`, 'POST', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUser?.id] });
      if (selectedUser && data.user) {
        setSelectedUser({ ...selectedUser, credits: data.user.credits, creditExpiryDate: data.user.creditExpiryDate });
      }
      toast({ title: "Kredit yangilandi", description: `Yangi balans: ${data.user?.credits} kredit` });
      setCreditAmount("");
    },
    onError: (e: any) => {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    },
  });

  const users = usersData?.users || [];

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      (user.name?.toLowerCase().includes(q)) ||
      (user.phone?.includes(searchQuery)) ||
      (user.telegramId?.includes(searchQuery))
    );
  });

  const getExpiryStatus = (expiryDate: string | null, credits: number) => {
    if (!expiryDate || credits === 0) {
      return { text: "Kredit yo'q", color: "text-muted-foreground", bg: "bg-muted/50", dot: "bg-muted-foreground" };
    }
    const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return { text: "Muddati o'tgan", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", dot: "bg-red-500" };
    if (daysLeft <= 5) return { text: `${daysLeft} kun qoldi`, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", dot: "bg-amber-500" };
    return { text: `${daysLeft} kun qoldi`, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", dot: "bg-emerald-500" };
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleAdjust = () => {
    const amt = parseInt(creditAmount);
    if (!amt || amt <= 0) return toast({ title: "Miqdor kiriting", variant: "destructive" });
    adjustCreditsMutation.mutate({
      amount: amt,
      type: creditMode,
      expiryDays: creditMode === 'add' ? parseInt(expiryDays) : undefined,
    });
  };

  if (!isVerified) return null;

  const totalCredits = users.reduce((s, u) => s + (u.credits || 0), 0);
  const activeUsers = users.filter(u => u.credits > 0).length;
  const expiredUsers = users.filter(u => {
    if (!u.creditExpiryDate || u.credits === 0) return false;
    return new Date(u.creditExpiryDate) < new Date();
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-blue-200/70 hover:text-white hover:bg-white/10 h-9 w-9" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Foydalanuvchilar</h1>
              <p className="text-blue-200/60 text-sm">Jami {users.length} ta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-3">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: Users, color: "text-blue-500", label: "Jami", val: users.length },
            { icon: TrendingUp, color: "text-emerald-500", label: "Aktiv (kredit bor)", val: activeUsers },
            { icon: AlertTriangle, color: "text-red-500", label: "Muddati o'tgan", val: expiredUsers },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border shadow-sm p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold">{s.val}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism, telefon yoki Telegram ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border"
            data-testid="input-search-users"
          />
        </div>

        {isError ? (
          <div className="text-center py-16">
            <AlertTriangle className="h-10 w-10 mx-auto text-destructive/50 mb-3" />
            <p className="text-destructive font-medium">{(error as any)?.message || "Xatolik"}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Foydalanuvchilar topilmadi</p>
          </div>
        ) : (
          <div className="space-y-2.5 pb-6">
            {filteredUsers.map((user) => {
              const exp = getExpiryStatus(user.creditExpiryDate, user.credits);
              const initials = user.name
                ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
                : '?';

              return (
                <Card
                  key={user.id}
                  className="border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => setSelectedUser(user)}
                  data-testid={`card-user-${user.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">
                            {user.name || <span className="text-muted-foreground italic">Ism yo'q</span>}
                          </h3>
                          {user.isAdmin && (
                            <Badge variant="default" className="text-[10px] h-4.5 px-1.5 gap-0.5 shrink-0">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              Admin
                            </Badge>
                          )}
                          {!user.profileCompleted && (
                            <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 shrink-0">Profil to'liqsiz</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {user.phone && <span>{user.phone}</span>}
                          {user.telegramId && <span className="text-blue-400">TG: {user.telegramId}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                          <span className="font-bold text-sm" data-testid={`text-credits-${user.id}`}>{user.credits}</span>
                          <span className="text-xs text-muted-foreground">kr</span>
                        </div>
                        <div className={`flex items-center gap-1 justify-end mt-1 px-2 py-0.5 rounded-full ${exp.bg}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${exp.dot}`} />
                          <span className={`text-[10px] font-medium ${exp.color}`}>{exp.text}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) { setSelectedUser(null); setCreditAmount(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0" data-testid="dialog-user-detail">
          {selectedUser && (
            <>
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-5 text-white shrink-0">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold shrink-0">
                      {selectedUser.name ? selectedUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?'}
                    </div>
                    <div>
                      <DialogTitle className="text-xl text-white font-bold">
                        {selectedUser.name || "Ism ko'rsatilmagan"}
                      </DialogTitle>
                      <DialogDescription className="text-blue-100/80 text-sm mt-0.5">
                        {selectedUser.isAdmin ? "Admin foydalanuvchi" : "Oddiy foydalanuvchi"}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="bg-white/20 rounded-xl px-4 py-2 flex-1 text-center">
                      <p className="text-blue-100/70 text-xs">Kredit balansi</p>
                      <p className="text-2xl font-bold">{selectedUser.credits}</p>
                    </div>
                    {selectedUser.creditExpiryDate && selectedUser.credits > 0 && (
                      <div className="bg-white/20 rounded-xl px-4 py-2 flex-1 text-center">
                        <p className="text-blue-100/70 text-xs">Muddati</p>
                        <p className="text-sm font-semibold">{formatDate(selectedUser.creditExpiryDate)}</p>
                      </div>
                    )}
                  </div>
                </DialogHeader>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-5 space-y-5">
                  {/* Profile Info */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Shaxsiy ma'lumotlar</h3>
                    <div className="rounded-xl border bg-card divide-y">
                      {selectedUser.phone && (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-[11px] text-muted-foreground">Telefon</p>
                            <p className="text-sm font-medium">{selectedUser.phone}</p>
                          </div>
                        </div>
                      )}
                      {selectedUser.telegramId && (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <MessageCircle className="h-4 w-4 text-blue-400 shrink-0" />
                          <div>
                            <p className="text-[11px] text-muted-foreground">Telegram ID</p>
                            <p className="text-sm font-medium font-mono">{selectedUser.telegramId}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">Profil holati</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {selectedUser.profileCompleted
                              ? <Badge variant="secondary" className="text-xs gap-1"><Check className="h-3 w-3" />To'ldirilgan</Badge>
                              : <Badge variant="outline" className="text-xs gap-1"><X className="h-3 w-3" />To'liqsiz</Badge>
                            }
                            {selectedUser.isAdmin && <Badge className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />Admin</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credit Adjustment */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Kredit boshqarish</h3>
                    <div className="rounded-xl border bg-card p-4 space-y-4">
                      {/* Mode tabs */}
                      <div className="grid grid-cols-3 gap-1.5 bg-muted/50 p-1 rounded-lg">
                        {[
                          { key: "add", label: "Qo'shish", icon: Plus, color: "text-emerald-600" },
                          { key: "remove", label: "Ayirish", icon: Minus, color: "text-red-600" },
                          { key: "set", label: "Belgilash", icon: Edit3, color: "text-blue-600" },
                        ].map(m => (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setCreditMode(m.key as any)}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                              creditMode === m.key
                                ? 'bg-card shadow-sm ' + m.color
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            data-testid={`button-credit-mode-${m.key}`}
                          >
                            <m.icon className="h-3.5 w-3.5" />
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Amount input */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">
                            {creditMode === 'add' ? "Qo'shish miqdori" : creditMode === 'remove' ? "Ayirish miqdori" : "Yangi qiymat"}
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(e.target.value)}
                            placeholder="0"
                            className="h-10 mt-1"
                            data-testid="input-credit-amount"
                          />
                        </div>
                        {creditMode === 'add' && (
                          <div>
                            <Label className="text-xs">Muddati (kun)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={expiryDays}
                              onChange={(e) => setExpiryDays(e.target.value)}
                              placeholder="30"
                              className="h-10 mt-1"
                              data-testid="input-expiry-days"
                            />
                          </div>
                        )}
                      </div>

                      {/* Quick amounts */}
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1.5">Tez miqdorlar:</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {[10, 20, 30, 50, 60, 100, 130, 240].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setCreditAmount(String(n))}
                              className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                                creditAmount === String(n)
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-border hover:bg-muted'
                              }`}
                              data-testid={`button-quick-credit-${n}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={handleAdjust}
                        disabled={adjustCreditsMutation.isPending || !creditAmount}
                        className={`w-full ${
                          creditMode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' :
                          creditMode === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''
                        }`}
                        data-testid="button-adjust-credits"
                      >
                        {adjustCreditsMutation.isPending ? "Saqlanmoqda..." :
                          creditMode === 'add' ? `+${creditAmount || '?'} kredit qo'shish` :
                          creditMode === 'remove' ? `-${creditAmount || '?'} kredit ayirish` :
                          `${creditAmount || '?'} ga belgilash`}
                      </Button>

                      {/* Preview */}
                      {creditAmount && !isNaN(parseInt(creditAmount)) && (
                        <div className="text-center text-xs text-muted-foreground py-1 bg-muted/30 rounded-lg">
                          {selectedUser.credits} →{" "}
                          <span className="font-semibold text-foreground">
                            {creditMode === 'add' ? selectedUser.credits + parseInt(creditAmount) :
                             creditMode === 'remove' ? Math.max(0, selectedUser.credits - parseInt(creditAmount)) :
                             parseInt(creditAmount)}
                          </span>
                          {" "}kredit
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Booking history */}
                  {isDetailLoading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}
                    </div>
                  ) : (userDetail?.bookings?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        Bronlar tarixi ({userDetail!.bookings.length})
                      </h3>
                      <div className="space-y-1.5">
                        {userDetail!.bookings.slice(0,5).map(b => (
                          <div key={b.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-medium">{formatDate(b.bookingDate)}</p>
                              </div>
                            </div>
                            <Badge
                              variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}
                              className="text-[10px]"
                            >
                              {b.status === 'confirmed' ? 'Tasdiqlangan' : b.status === 'cancelled' ? 'Bekor' : 'Kutilmoqda'}
                            </Badge>
                          </div>
                        ))}
                        {userDetail!.bookings.length > 5 && (
                          <p className="text-xs text-center text-muted-foreground">+ {userDetail!.bookings.length - 5} ta bron</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Purchases */}
                  {!isDetailLoading && (userDetail?.purchases?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Xaridlar ({userDetail!.purchases.length})
                      </h3>
                      <div className="space-y-1.5">
                        {userDetail!.purchases.slice(0,5).map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-xs font-medium">{p.packageName || 'Kredit paketi'}</p>
                              <p className="text-[11px] text-muted-foreground">{formatDate(p.createdAt)}</p>
                            </div>
                            {p.creditsAdded && (
                              <span className="text-xs font-bold text-emerald-600">+{p.creditsAdded} kr</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
