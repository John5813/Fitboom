import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { VideoCollection, OnlineClass } from "@shared/schema";
import { CATEGORIES } from "@shared/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Trash2, Pencil, Video, Play, Clock, User as UserIcon,
  Lock, Unlock, ChevronDown, ChevronUp, CreditCard, Image as ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

type CollectionWithMeta = VideoCollection & { videoCount?: number; isPurchased?: boolean };

const EMPTY_COLLECTION = {
  name: "", description: "", thumbnailUrl: "",
  isFree: true, price: 0, categories: [] as string[],
};
const EMPTY_VIDEO = {
  title: "", description: "", videoUrl: "", thumbnailUrl: "",
  duration: "", instructor: "", categories: [] as string[],
};

type CFormState = typeof EMPTY_COLLECTION;
type VFormState = typeof EMPTY_VIDEO;

// ─── Upload helper (module-level util) ───────────────────────────────────────
async function uploadImageFile(
  file: File,
  onUrl: (url: string) => void,
  onLoading: (v: boolean) => void,
  onError: (msg: string) => void,
) {
  onLoading(true);
  try {
    const fd = new FormData();
    fd.append('image', file);
    const r = await fetch('/api/upload-image', { method: 'POST', credentials: 'include', body: fd });
    if (!r.ok) throw new Error('Rasm yuklashda xatolik');
    const d = await r.json();
    onUrl(d.imageUrl);
  } catch (e: any) {
    onError(e.message || "Rasm yuklashda xatolik");
  } finally {
    onLoading(false);
  }
}

// ─── Collection Form Dialog (module-level) ───────────────────────────────────
function CollectionFormDialog({
  open, onClose, initial, onSubmit, pending, title,
}: {
  open: boolean;
  onClose: () => void;
  initial: CFormState;
  onSubmit: (d: CFormState) => void;
  pending: boolean;
  title: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<CFormState>(initial);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (open) setForm(initial); }, [open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImageFile(
      file,
      (url) => setForm(f => ({ ...f, thumbnailUrl: url })),
      setUploading,
      (msg) => toast({ title: "Xatolik", description: msg, variant: "destructive" }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">

          {/* Name */}
          <div>
            <Label className="text-xs text-muted-foreground">Kurs nomi *</Label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Masalan: Yoga boshlang'ich kursi"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Tavsif</Label>
            <Textarea
              className="mt-1 resize-none" rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Kurs haqida qisqacha..."
            />
          </div>

          {/* Thumbnail */}
          <div>
            <Label className="text-xs text-muted-foreground">Muqova rasmi</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={form.thumbnailUrl}
                onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
                placeholder="https://..."
                className="flex-1"
              />
              <label
                className={`flex items-center justify-center h-10 px-3 rounded-md border text-sm cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-muted'}`}
                title="Rasm yuklash"
              >
                {uploading ? (
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
            {form.thumbnailUrl && (
              <img
                src={form.thumbnailUrl}
                alt="preview"
                className="mt-2 w-full h-32 object-cover rounded-lg border"
              />
            )}
          </div>

          {/* Categories */}
          <div>
            <Label className="text-xs text-muted-foreground">Kategoriyalar</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    categories: f.categories.includes(cat.id)
                      ? f.categories.filter(c => c !== cat.id)
                      : [...f.categories, cat.id],
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all font-medium ${form.categories.includes(cat.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Free/Paid toggle */}
          <div>
            <Label className="text-xs text-muted-foreground">Narx turi</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isFree: true, price: 0 }))}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${form.isFree ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border hover:bg-muted'}`}
              >
                <Unlock className="h-4 w-4" /> Bepul
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isFree: false }))}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${!form.isFree ? 'bg-orange-500 text-white border-orange-500' : 'border-border hover:bg-muted'}`}
              >
                <Lock className="h-4 w-4" /> Pulli
              </button>
            </div>
          </div>

          {/* Credit cost */}
          {!form.isFree && (
            <div>
              <Label className="text-xs text-muted-foreground">Kredit narxi</Label>
              <div className="mt-1 relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number" min="1" className="pl-9"
                  value={form.price || ''}
                  onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  placeholder="Masalan: 30"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Foydalanuvchi kursni ochish uchun shu miqdor kredit sarflaydi
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Bekor qilish</Button>
          <Button
            className="flex-1"
            disabled={pending || !form.name.trim()}
            onClick={() => onSubmit(form)}
          >
            {pending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Video Form Dialog (module-level) ────────────────────────────────────────
function VideoFormDialog({
  open, onClose, initial, onSubmit, pending, title,
}: {
  open: boolean;
  onClose: () => void;
  initial: VFormState;
  onSubmit: (d: VFormState) => void;
  pending: boolean;
  title: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<VFormState>(initial);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (open) setForm(initial); }, [open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImageFile(
      file,
      (url) => setForm(f => ({ ...f, thumbnailUrl: url })),
      setUploading,
      (msg) => toast({ title: "Xatolik", description: msg, variant: "destructive" }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">

          <div>
            <Label className="text-xs text-muted-foreground">Video sarlavhasi *</Label>
            <Input
              className="mt-1"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Masalan: 1-dars: Boshlang'ich qoida"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Video URL (YouTube / link) *</Label>
            <Input
              className="mt-1"
              value={form.videoUrl}
              onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Davomiyligi (daqiqa)</Label>
              <Input
                type="number" min="1" className="mt-1"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="30"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Murabbiy</Label>
              <Input
                className="mt-1"
                value={form.instructor}
                onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
                placeholder="Ism Familiya"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tavsif</Label>
            <Textarea
              className="mt-1 resize-none" rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Video haqida qisqacha..."
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Muqova rasmi</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={form.thumbnailUrl}
                onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
                placeholder="https://..."
                className="flex-1"
              />
              <label
                className={`flex items-center justify-center h-10 px-3 rounded-md border text-sm cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-muted'}`}
                title="Rasm yuklash"
              >
                {uploading ? (
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
            {form.thumbnailUrl && (
              <img src={form.thumbnailUrl} alt="preview" className="mt-2 w-full h-24 object-cover rounded-lg border" />
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Kategoriyalar</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    categories: f.categories.includes(cat.id)
                      ? f.categories.filter(c => c !== cat.id)
                      : [...f.categories, cat.id],
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all font-medium ${form.categories.includes(cat.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Bekor qilish</Button>
          <Button
            className="flex-1"
            disabled={pending || !form.title.trim() || !form.videoUrl.trim()}
            onClick={() => onSubmit(form)}
          >
            {pending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminCollectionsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isVerified = sessionStorage.getItem('adminVerified') === 'true';
  useEffect(() => { if (!isVerified) setLocation('/admin'); }, [isVerified]);

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCollection, setEditCollection] = useState<CollectionWithMeta | null>(null);
  const [editInitial, setEditInitial] = useState<CFormState>(EMPTY_COLLECTION);
  const [addVideoFor, setAddVideoFor] = useState<string | null>(null);
  const [editVideo, setEditVideo] = useState<OnlineClass | null>(null);
  const [editVideoInitial, setEditVideoInitial] = useState<VFormState>(EMPTY_VIDEO);

  // Data
  const { data: collectionsData, isLoading } = useQuery<{ collections: CollectionWithMeta[] }>({
    queryKey: ['/api/collections'],
  });
  const collections = collectionsData?.collections || [];

  const { data: videosData } = useQuery<{ classes: OnlineClass[] }>({
    queryKey: ['/api/admin/classes', expandedId],
    queryFn: () =>
      fetch(`/api/admin/classes?collectionId=${expandedId}`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!expandedId,
  });
  const videos = videosData?.classes || [];

  // ─── Collection mutations ───
  const createCollection = useMutation({
    mutationFn: (data: CFormState) =>
      apiRequest('/api/collections', 'POST', { ...data, price: data.isFree ? 0 : (Number(data.price) || 0) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      setCreateOpen(false);
      toast({ title: "Kurs yaratildi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const updateCollection = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CFormState }) =>
      apiRequest(`/api/collections/${id}`, 'PUT', { ...data, price: data.isFree ? 0 : (Number(data.price) || 0) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      setEditCollection(null);
      toast({ title: "Kurs yangilandi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const deleteCollection = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/collections/${id}`, 'DELETE').then(r => r.json()),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      if (expandedId === id) setExpandedId(null);
      toast({ title: "Kurs o'chirildi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  // ─── Video mutations ───
  const createVideo = useMutation({
    mutationFn: (data: VFormState & { collectionId: string }) =>
      apiRequest('/api/admin/classes', 'POST', { ...data, duration: Number(data.duration) || 0, orderIndex: 0 }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes', expandedId] });
      setAddVideoFor(null);
      toast({ title: "Video qo'shildi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const updateVideo = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VFormState }) =>
      apiRequest(`/api/admin/classes/${id}`, 'PUT', { ...data, duration: Number(data.duration) || 0 }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes', expandedId] });
      setEditVideo(null);
      toast({ title: "Video yangilandi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const deleteVideo = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/classes/${id}`, 'DELETE').then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes', expandedId] });
      toast({ title: "Video o'chirildi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  if (!isVerified) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <Link href="/admin">
            <button className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Video Kurslar</h1>
            <p className="text-purple-200 text-sm">{collections.length} ta kurs</p>
          </div>
          <Button
            size="sm"
            className="bg-white text-purple-700 hover:bg-purple-50 gap-1.5"
            onClick={() => setCreateOpen(true)}
            data-testid="button-create-collection"
          >
            <Plus className="h-4 w-4" /> Yangi kurs
          </Button>
        </div>
      </div>

      {/* Collections list */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/50 animate-pulse" />)
        ) : collections.length === 0 ? (
          <div className="text-center py-20">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Hozircha kurslar yo'q</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Birinchi kurs yarating
            </Button>
          </div>
        ) : collections.map(col => {
          const isExpanded = expandedId === col.id;
          return (
            <div key={col.id} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              {/* Collection row */}
              <div className="flex items-center gap-3 p-4">
                {/* Thumbnail */}
                <div className="h-16 w-24 rounded-xl overflow-hidden bg-muted shrink-0">
                  {col.thumbnailUrl ? (
                    <img src={col.thumbnailUrl} alt={col.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{col.name}</span>
                    {col.isFree ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 text-[10px] h-5 px-2">
                        <Unlock className="h-2.5 w-2.5 mr-1" /> Bepul
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border-0 text-[10px] h-5 px-2">
                        <CreditCard className="h-2.5 w-2.5 mr-1" /> {col.price} kr
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Play className="h-3 w-3" /> {col.videoCount ?? 0} ta video
                    </span>
                    {(col.categories || []).slice(0, 2).map(c => {
                      const cat = CATEGORIES.find(x => x.id === c);
                      return cat ? (
                        <span key={c} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {cat.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      const init: CFormState = {
                        name: col.name,
                        description: col.description,
                        thumbnailUrl: col.thumbnailUrl,
                        isFree: col.isFree,
                        price: col.price,
                        categories: col.categories || [],
                      };
                      setEditInitial(init);
                      setEditCollection(col);
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    data-testid={`button-edit-collection-${col.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${col.name}" kursini o'chirmoqchimisiz?`))
                        deleteCollection.mutate(col.id);
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    data-testid={`button-delete-collection-${col.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : col.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    data-testid={`button-expand-${col.id}`}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded: Videos */}
              {isExpanded && (
                <div className="border-t bg-muted/20">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Videolar
                    </span>
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => { setEditVideoInitial(EMPTY_VIDEO); setAddVideoFor(col.id); }}
                      data-testid={`button-add-video-${col.id}`}
                    >
                      <Plus className="h-3 w-3" /> Video qo'shish
                    </Button>
                  </div>

                  {videos.length === 0 ? (
                    <div className="px-4 pb-4 text-center">
                      <p className="text-sm text-muted-foreground">Hozircha videolar yo'q</p>
                    </div>
                  ) : (
                    <div className="px-4 pb-4 space-y-2">
                      {videos.map((v, idx) => (
                        <div key={v.id} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border">
                          <div className="h-10 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                            {v.thumbnailUrl ? (
                              <img src={v.thumbnailUrl} alt={v.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Play className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{idx + 1}. {v.title}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {v.duration ? (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />{v.duration} daq.
                                </span>
                              ) : null}
                              {v.instructor ? (
                                <span className="flex items-center gap-0.5">
                                  <UserIcon className="h-3 w-3" />{v.instructor}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                const init: VFormState = {
                                  title: v.title,
                                  description: v.description || '',
                                  videoUrl: v.videoUrl,
                                  thumbnailUrl: v.thumbnailUrl || '',
                                  duration: String(v.duration || ''),
                                  instructor: v.instructor || '',
                                  categories: v.categories || [],
                                };
                                setEditVideoInitial(init);
                                setEditVideo(v);
                              }}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`"${v.title}" ni o'chirmoqchimisiz?`)) deleteVideo.mutate(v.id); }}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collection dialogs */}
      <CollectionFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initial={EMPTY_COLLECTION}
        title="Yangi kurs yaratish"
        pending={createCollection.isPending}
        onSubmit={(d) => createCollection.mutate(d)}
      />
      <CollectionFormDialog
        open={!!editCollection}
        onClose={() => setEditCollection(null)}
        initial={editInitial}
        title="Kursni tahrirlash"
        pending={updateCollection.isPending}
        onSubmit={(d) => editCollection && updateCollection.mutate({ id: editCollection.id, data: d })}
      />

      {/* Video dialogs */}
      <VideoFormDialog
        open={!!addVideoFor}
        onClose={() => setAddVideoFor(null)}
        initial={EMPTY_VIDEO}
        title="Yangi video qo'shish"
        pending={createVideo.isPending}
        onSubmit={(d) => addVideoFor && createVideo.mutate({ ...d, collectionId: addVideoFor })}
      />
      <VideoFormDialog
        open={!!editVideo}
        onClose={() => setEditVideo(null)}
        initial={editVideoInitial}
        title="Videoni tahrirlash"
        pending={updateVideo.isPending}
        onSubmit={(d) => editVideo && updateVideo.mutate({ id: editVideo.id, data: d })}
      />
    </div>
  );
}
