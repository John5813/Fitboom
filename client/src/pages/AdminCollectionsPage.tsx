import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { VideoCollection, OnlineClass } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Plus, ArrowLeft, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function AdminCollectionsPage() {
  const [selectedCollection, setSelectedCollection] = useState<VideoCollection | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddVideoDialogOpen, setIsAddVideoDialogOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const { toast } = useToast();

  const [collectionForm, setCollectionForm] = useState({
    name: '',
    description: '',
    price: '',
    thumbnailUrl: '',
    category: '',
  });

  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: '',
    instructor: '',
  });

  const { data: collectionsData, isLoading } = useQuery<{ collections: VideoCollection[] }>({
    queryKey: ['/api/collections'],
  });

  const { data: collectionVideosData } = useQuery<{ classes: OnlineClass[] }>({
    queryKey: ['/api/classes', activeCollectionId],
    queryFn: () => 
      fetch(`/api/classes?collectionId=${activeCollectionId}`, {
        credentials: 'include'
      }).then(res => res.json()),
    enabled: !!activeCollectionId,
  });

  const collections = collectionsData?.collections || [];
  const collectionVideos = collectionVideosData?.classes || [];

  const createCollectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/collections', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      toast({
        title: "To'plam yaratildi",
        description: `${collectionForm.name} muvaffaqiyatli yaratildi.`,
      });
      setIsCreateDialogOpen(false);
      setCollectionForm({
        name: '',
        description: '',
        price: '',
        thumbnailUrl: '',
        category: '',
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "To'plam yaratishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const addVideoMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/classes', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({
        title: "Video qo'shildi",
        description: `${videoForm.title} muvaffaqiyatli qo'shildi.`,
      });
      setIsAddVideoDialogOpen(false);
      setVideoForm({
        title: '',
        description: '',
        videoUrl: '',
        duration: '',
        instructor: '',
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Video qo'shishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handleCreateCollection = () => {
    if (!collectionForm.name || !collectionForm.price || !collectionForm.category) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, nomi, kategoriya va narxni kiriting.",
        variant: "destructive"
      });
      return;
    }

    createCollectionMutation.mutate({
      ...collectionForm,
      price: parseFloat(collectionForm.price)
    });
  };

  const handleAddVideo = () => {
    if (!videoForm.title || !videoForm.videoUrl || !videoForm.duration || !activeCollectionId) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring.",
        variant: "destructive"
      });
      return;
    }

    addVideoMutation.mutate({
      ...videoForm,
      duration: parseInt(videoForm.duration),
      collectionId: activeCollectionId
    });
  };

  const openAddVideoDialog = (collectionId: string) => {
    setActiveCollectionId(collectionId);
    setIsAddVideoDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Orqaga
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">Video To'plamlar</h1>
            <p className="text-muted-foreground mt-2">Barcha video to'plamlar va kurslar</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-collection">
          <Plus className="h-4 w-4 mr-2" />
          Yangi To'plam
        </Button>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Yuklanmoqda...</div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            To'plamlar topilmadi
          </div>
        ) : (
          <ScrollArea className="h-[60vh] lg:h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 sticky top-0 bg-card z-10">№</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10">To'plam Nomi</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10">Videolar</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10">Narx</TableHead>
                  <TableHead className="w-32 sticky top-0 bg-card z-10">Harakatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection, index) => (
                  <TableRow key={collection.id} data-testid={`row-collection-${collection.id}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-semibold" data-testid={`text-collection-name-${collection.id}`}>
                      {collection.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{(collection as any).videoCount || 0} ta</Badge>
                    </TableCell>
                    <TableCell>{collection.price.toLocaleString()} so'm</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCollection(collection)}
                          data-testid={`button-view-${collection.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddVideoDialog(collection.id)}
                          data-testid={`button-add-video-${collection.id}`}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      {/* Collection Detail Dialog */}
      <Dialog open={!!selectedCollection} onOpenChange={(open) => !open && setSelectedCollection(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-collection-detail">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {selectedCollection?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCollection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Narx</p>
                  <p className="font-semibold">{selectedCollection.price.toLocaleString()} so'm</p>
                </div>
              </div>

              {selectedCollection.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Tavsif</p>
                  <p className="text-sm">{selectedCollection.description}</p>
                </div>
              )}

              {selectedCollection.thumbnailUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Rasm</p>
                  <img 
                    src={selectedCollection.thumbnailUrl} 
                    alt={selectedCollection.name}
                    className="rounded-lg w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Collection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-collection">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Yangi To'plam Yaratish</DialogTitle>
            <DialogDescription>
              Yangi video to'plam ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">To'plam nomi *</Label>
              <Input
                id="name"
                value={collectionForm.name}
                onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                placeholder="Misol: Beginner Yoga Course"
                data-testid="input-collection-name"
              />
            </div>

            <div>
              <Label htmlFor="price">Narx (so'm) *</Label>
              <Input
                id="price"
                type="number"
                value={collectionForm.price}
                onChange={(e) => setCollectionForm({ ...collectionForm, price: e.target.value })}
                placeholder="150000"
                data-testid="input-collection-price"
              />
            </div>

            <div>
              <Label htmlFor="category">Kategoriya *</Label>
              <Input
                id="category"
                value={collectionForm.category}
                onChange={(e) => setCollectionForm({ ...collectionForm, category: e.target.value })}
                placeholder="Misol: Yoga, Fitnes, Pilates"
                data-testid="input-collection-category"
              />
            </div>

            <div>
              <Label htmlFor="thumbnailUrl">Rasm URL</Label>
              <Input
                id="thumbnailUrl"
                value={collectionForm.thumbnailUrl}
                onChange={(e) => setCollectionForm({ ...collectionForm, thumbnailUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="input-collection-thumbnail"
              />
            </div>

            <div>
              <Label htmlFor="description">Tavsif</Label>
              <Textarea
                id="description"
                value={collectionForm.description}
                onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                placeholder="To'plam haqida qisqacha ma'lumot..."
                rows={3}
                data-testid="input-collection-description"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateCollection}
                disabled={createCollectionMutation.isPending}
                className="flex-1"
                data-testid="button-submit-collection"
              >
                {createCollectionMutation.isPending ? 'Yuklanmoqda...' : "Yaratish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="flex-1"
                data-testid="button-cancel-collection"
              >
                Bekor qilish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Video Dialog */}
      <Dialog open={isAddVideoDialogOpen} onOpenChange={setIsAddVideoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-video">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Video Qo'shish</DialogTitle>
            <DialogDescription>
              To'plamga yangi video qo'shing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Video nomi *</Label>
              <Input
                id="title"
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="Misol: Day 1: Introduction to Yoga"
                data-testid="input-video-title"
              />
            </div>

            <div>
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input
                id="videoUrl"
                value={videoForm.videoUrl}
                onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                placeholder="https://... (YouTube, Vimeo, yoki boshqa video URL)"
                data-testid="input-video-url"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Har qanday video platformasidan URL kiriting
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Davomiyligi (daqiqa) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={videoForm.duration}
                  onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })}
                  placeholder="45"
                  data-testid="input-video-duration"
                />
              </div>
              <div>
                <Label htmlFor="instructor">Instructor</Label>
                <Input
                  id="instructor"
                  value={videoForm.instructor}
                  onChange={(e) => setVideoForm({ ...videoForm, instructor: e.target.value })}
                  placeholder="John Doe"
                  data-testid="input-video-instructor"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="videoDescription">Tavsif</Label>
              <Textarea
                id="videoDescription"
                value={videoForm.description}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                placeholder="Video haqida qisqacha ma'lumot..."
                rows={3}
                data-testid="input-video-description"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddVideo}
                disabled={addVideoMutation.isPending}
                className="flex-1"
                data-testid="button-submit-video"
              >
                {addVideoMutation.isPending ? 'Yuklanmoqda...' : "Qo'shish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddVideoDialogOpen(false)}
                className="flex-1"
                data-testid="button-cancel-video"
              >
                Bekor qilish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
