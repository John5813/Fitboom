import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Video, ListChecks } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/home">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Orqaga
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
              <Link href="/admin">
                <Button className="w-full" variant="outline" data-testid="button-manage-collections">
                  To'plamlar (Tez kunda)
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Future Feature Placeholder */}
          <Card className="opacity-60" data-testid="card-future">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <ListChecks className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Boshqa Funksiyalar</CardTitle>
                  <CardDescription>Tez kunda...</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Yangi boshqaruv funksiyalari qo'shilmoqda
              </p>
              <Button className="w-full" disabled>
                Tez kunda
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
