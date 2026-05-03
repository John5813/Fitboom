import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { VideoCollection } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Play, Lock, Unlock, CreditCard, Video, ChevronRight, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@shared/categories";

type CollectionWithMeta = VideoCollection & { videoCount?: number; isPurchased?: boolean };

export default function CoursesPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [confirmCollection, setConfirmCollection] = useState<CollectionWithMeta | null>(null);

  const { data: collectionsData, isLoading } = useQuery<{ collections: CollectionWithMeta[] }>({
    queryKey: ['/api/collections'],
  });

  const collections = collectionsData?.collections || [];

  const filtered = activeCategory === "all"
    ? collections
    : collections.filter(c => (c.categories || []).includes(activeCategory));

  const myCollections = filtered.filter(c => c.isPurchased);
  const availableCollections = filtered.filter(c => !c.isPurchased);

  const purchaseMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const r = await apiRequest(`/api/collections/${collectionId}/purchase`, 'POST', {});
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Xatolik");
      return data;
    },
    onSuccess: (data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: "Kurs ochildi!", description: "Endi barcha videolarni ko'ra olasiz." });
      setConfirmCollection(null);
      navigate(`/my-courses/${collectionId}`);
    },
    onError: (e: any) => {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
      setConfirmCollection(null);
    },
  });

  const handleCardClick = (col: CollectionWithMeta) => {
    if (col.isPurchased) {
      navigate(`/my-courses/${col.id}`);
    } else {
      setConfirmCollection(col);
    }
  };

  // Get unique categories used in collections
  const usedCategoryIds = new Set(collections.flatMap(c => c.categories || []));
  const usedCategories = CATEGORIES.filter(c => usedCategoryIds.has(c.id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500" />
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-5 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(249,115,22,0.4) 0%, transparent 65%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">{t('courses.title')}</h1>
            <p className="text-orange-200/70 text-sm">{collections.length} ta kurs mavjud</p>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/30 backdrop-blur-sm rounded-full px-3 py-1.5">
              <CreditCard className="h-4 w-4 text-orange-300" />
              <span className="text-sm font-bold">{user.credits ?? 0}</span>
              <span className="text-xs text-orange-200/80">kr</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {/* Category filter */}
        {usedCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${activeCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted"}`}
            >
              Hammasi
            </button>
            {usedCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${activeCategory === cat.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* My courses */}
        {myCollections.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Mening kurslarim ({myCollections.length})
            </h2>
            {myCollections.map(col => (
              <CollectionCard key={col.id} col={col} onClick={() => handleCardClick(col)} />
            ))}
          </div>
        )}

        {/* Available courses */}
        {availableCollections.length > 0 && (
          <div className="space-y-3">
            {myCollections.length > 0 && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Boshqa kurslar
              </h2>
            )}
            {availableCollections.map(col => (
              <CollectionCard key={col.id} col={col} onClick={() => handleCardClick(col)} />
            ))}
          </div>
        )}

        {/* Empty */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">
              {activeCategory === "all" ? "Hozircha kurslar yo'q" : "Bu kategoriyada kurs yo'q"}
            </p>
          </div>
        )}
      </div>

      {/* Confirm purchase dialog */}
      <Dialog open={!!confirmCollection} onOpenChange={open => { if (!open) setConfirmCollection(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kursni ochish</DialogTitle>
            <DialogDescription>
              Bu kursni ochish uchun {confirmCollection?.price} kredit sarflanadi
            </DialogDescription>
          </DialogHeader>

          {confirmCollection && (
            <div className="space-y-4 pt-2">
              {/* Collection preview */}
              <div className="flex gap-3 items-center p-3 bg-muted/50 rounded-xl">
                {confirmCollection.thumbnailUrl && (
                  <img src={confirmCollection.thumbnailUrl} alt={confirmCollection.name}
                    className="h-14 w-20 object-cover rounded-lg shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{confirmCollection.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{confirmCollection.videoCount ?? 0} ta video</p>
                </div>
              </div>

              {/* Credit info */}
              <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 rounded-xl px-4 py-3">
                <span className="text-sm text-muted-foreground">Kerakli kredit:</span>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-orange-500" />
                  <span className="font-bold text-orange-600">{confirmCollection.price} kredit</span>
                </div>
              </div>

              {/* User balance */}
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-muted-foreground">Sizda mavjud:</span>
                <span className={`font-bold ${(user?.credits ?? 0) < (confirmCollection.price ?? 0) ? 'text-red-500' : 'text-emerald-600'}`}>
                  {user?.credits ?? 0} kredit
                </span>
              </div>

              {(user?.credits ?? 0) < (confirmCollection.price ?? 0) && (
                <p className="text-sm text-red-500 text-center">
                  Kredit yetarli emas. Asosiy sahifadan kredit sotib oling.
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmCollection(null)}>
                  Bekor qilish
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  disabled={purchaseMutation.isPending || (user?.credits ?? 0) < (confirmCollection.price ?? 0)}
                  onClick={() => purchaseMutation.mutate(confirmCollection.id)}
                >
                  {purchaseMutation.isPending ? "Ochilmoqda..." : `${confirmCollection.price} kr sarfla`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollectionCard({ col, onClick }: { col: CollectionWithMeta; onClick: () => void }) {
  const hasAccess = col.isPurchased;

  return (
    <div
      className="flex gap-3 items-center bg-card border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
      onClick={onClick}
      data-testid={`card-collection-${col.id}`}
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-28 rounded-xl overflow-hidden bg-muted shrink-0">
        {col.thumbnailUrl ? (
          <img src={col.thumbnailUrl} alt={col.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Video className="h-7 w-7 text-muted-foreground/30" />
          </div>
        )}
        {/* Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center ${hasAccess ? 'bg-black/20' : 'bg-black/40'}`}>
          {hasAccess ? (
            <Play className="h-7 w-7 text-white drop-shadow" />
          ) : (
            <Lock className="h-6 w-6 text-white drop-shadow" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="font-semibold text-sm flex-1 truncate">{col.name}</p>
        </div>
        {col.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{col.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Play className="h-3 w-3" /> {col.videoCount ?? 0} video
          </span>
          {col.isFree ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 text-[10px] h-5 px-2">
              <Unlock className="h-2.5 w-2.5 mr-1" /> Bepul
            </Badge>
          ) : hasAccess ? (
            <Badge variant="secondary" className="text-[10px] h-5 px-2">
              ✓ Ochilgan
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border-0 text-[10px] h-5 px-2">
              <CreditCard className="h-2.5 w-2.5 mr-1" /> {col.price} kr
            </Badge>
          )}
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </div>
  );
}
