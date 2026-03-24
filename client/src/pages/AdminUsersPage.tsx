import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, CreditCard, Calendar, User, Users, TrendingUp,
  AlertTriangle, Clock, ShieldCheck
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface UserData {
  id: string;
  name: string | null;
  phone: string | null;
  telegramId: string | null;
  credits: number;
  creditExpiryDate: string | null;
  isAdmin: boolean;
  profileCompleted: boolean;
}

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const isVerified = sessionStorage.getItem('adminVerified') === 'true';

  useEffect(() => {
    if (!isVerified) setLocation('/admin');
  }, [isVerified]);

  const { data: usersData, isLoading, error, isError } = useQuery<{ users: UserData[] }>({
    queryKey: ['/api/admin/users'],
    enabled: isVerified,
  });

  const users = usersData?.users || [];

  if (isError) {
    console.error("Admin users fetch error:", error);
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (user.name?.toLowerCase().includes(searchLower)) ||
      (user.phone?.includes(searchQuery)) ||
      (user.telegramId?.includes(searchQuery))
    );
  });

  const getExpiryStatus = (expiryDate: string | null, credits: number) => {
    if (!expiryDate || credits === 0) {
      return { status: "none", text: "Kredit yo'q", variant: "outline" as const, color: "text-muted-foreground" };
    }
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      return { status: "expired", text: "Muddati o'tgan", variant: "destructive" as const, color: "text-red-500" };
    } else if (daysLeft <= 5) {
      return { status: "expiring", text: `${daysLeft} kun`, variant: "secondary" as const, color: "text-amber-500" };
    } else {
      return { status: "active", text: `${daysLeft} kun`, variant: "default" as const, color: "text-emerald-500" };
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('uz-UZ');
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
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] text-muted-foreground">Aktiv</span>
            </div>
            <p className="text-xl font-bold">{activeUsers}</p>
          </div>
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] text-muted-foreground">Kreditlar</span>
            </div>
            <p className="text-xl font-bold">{totalCredits}</p>
          </div>
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[11px] text-muted-foreground">Muddati o'tgan</span>
            </div>
            <p className="text-xl font-bold">{expiredUsers}</p>
          </div>
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
            <p className="text-destructive font-medium mb-1">Xatolik yuz berdi</p>
            <p className="text-sm text-muted-foreground">{error?.message || "Ma'lumotlarni yuklashda xatolik"}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Foydalanuvchilar topilmadi</p>
          </div>
        ) : (
          <div className="space-y-2.5 pb-6">
            {filteredUsers.map((user) => {
              const expiryInfo = getExpiryStatus(user.creditExpiryDate, user.credits);
              const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?';

              return (
                <Card key={user.id} className="border transition-all hover:shadow-sm" data-testid={`card-user-${user.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">
                            {user.name || "Ism ko'rsatilmagan"}
                          </h3>
                          {user.isAdmin && (
                            <Badge variant="default" className="text-[10px] h-5 px-1.5 gap-0.5 shrink-0">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 overflow-hidden">
                          {user.phone && <span className="truncate">{user.phone}</span>}
                          {user.telegramId && <span className="truncate">TG: {user.telegramId}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <CreditCard className="h-3.5 w-3.5 text-primary" />
                            <span className="font-bold text-sm">{user.credits}</span>
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <Clock className={`h-3 w-3 ${expiryInfo.color}`} />
                            <span className={`text-[11px] font-medium ${expiryInfo.color}`}>
                              {expiryInfo.text}
                            </span>
                          </div>
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
    </div>
  );
}
