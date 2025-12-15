import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, CreditCard, Calendar, User } from "lucide-react";
import { Link } from "wouter";
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
  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersData, isLoading, error, isError } = useQuery<{ users: UserData[] }>({
    queryKey: ['/api/admin/users'],
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
      return { status: "none", text: "Kredit yo'q", variant: "outline" as const };
    }

    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { status: "expired", text: "Muddati o'tgan", variant: "destructive" as const };
    } else if (daysLeft <= 5) {
      return { status: "expiring", text: `${daysLeft} kun qoldi`, variant: "secondary" as const };
    } else {
      return { status: "active", text: `${daysLeft} kun qoldi`, variant: "default" as const };
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Orqaga
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">Foydalanuvchilar</h1>
            <p className="text-muted-foreground mt-1">
              Jami: {users.length} ta foydalanuvchi
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ism, telefon yoki Telegram ID bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </CardContent>
        </Card>

        {isError ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-2">Xatolik yuz berdi</p>
            <p className="text-sm text-muted-foreground">{error?.message || "Ma'lumotlarni yuklashda xatolik"}</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Yuklanmoqda...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Foydalanuvchilar topilmadi</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((user) => {
              const expiryInfo = getExpiryStatus(user.creditExpiryDate, user.credits);
              
              return (
                <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">
                            {user.name || "Ism ko'rsatilmagan"}
                          </h3>
                          {user.isAdmin && (
                            <Badge variant="default" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          {user.phone && <span>{user.phone}</span>}
                          {user.telegramId && <span>TG: {user.telegramId}</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.credits} kredit</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <Badge variant={expiryInfo.variant}>
                            {expiryInfo.text}
                          </Badge>
                        </div>
                        
                        {user.creditExpiryDate && user.credits > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(user.creditExpiryDate)}
                          </span>
                        )}
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
