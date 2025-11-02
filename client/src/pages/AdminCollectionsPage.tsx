import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { VideoCollection, OnlineClass, Category } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Plus, ArrowLeft, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
    categories: [] as string[],
    isFree: 'false',
  });

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);

  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: '',
    instructor: '',
    thumbnailUrl: '',
  });

  const [uploadingVideoThumbnail, setUploadingVideoThumbnail] = useState(false);
  const [selectedVideoThumbnail, setSelectedVideoThumbnail] = useState<File | null>(null);

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

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ['/api/categories'],
  });

  const categories = categoriesData?.categories || [];

  const toggleCategory = (categoryName: string) => {
    const cats = collectionForm.categories || [];
    if (cats.includes(categoryName)) {
      setCollectionForm({
        ...collectionForm,
        categories: cats.filter(c => c !== categoryName)
      });
    } else {
      setCollectionForm({
        ...collectionForm,
        categories: [...cats, categoryName]
      });
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Rasm yuklashda xatolik');
      }

      const data = await response.json();
      setCollectionForm({ ...collectionForm, thumbnailUrl: data.imageUrl });
      setSelectedThumbnail(file);

      toast({
        title: "Rasm yuklandi",
        description: "Rasm muvaffaqiyatli yuklandi",
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Rasm yuklashda xatolik yuz berdi",
        variant: "destructive"
      });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleVideoThumbnailUpload = async (file: File) => {
    setUploadingVideoThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Rasm yuklashda xatolik');
      }

      const data = await response.json();
      setVideoForm({ ...videoForm, thumbnailUrl: data.imageUrl });
      setSelectedVideoThumbnail(file);

      toast({
        title: "Rasm yuklandi",
        description: "Video rasmi muvaffaqiyatli yuklandi",
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Rasm yuklashda xatolik yuz berdi",
        variant: "destructive"
      });
    } finally {
      setUploadingVideoThumbnail(false);
    }
  };

  const createCollectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/collections', 'POST', data);
      return response.json();
    },
    onSuccess: (data) => {
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
        categories: [],
        isFree: 'false',
      });
      setSelectedThumbnail(null);
      
      // Avtomatik ravishda video qo'shish dialogini ochish
      if (data.collection?.id) {
        setTimeout(() => {
          openAddVideoDialog(data.collection.id);
        }, 300);
      }
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
        thumbnailUrl: '',
      });
      setSelectedVideoThumbnail(null);
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
    if (!collectionForm.name || (!collectionForm.category && collectionForm.categories.length === 0)) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, nomi va kategoriyani kiriting.",
        variant: "destructive"
      });
      return;
    }

    if (collectionForm.isFree === 'false' && !collectionForm.price) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Pullik video uchun narxni kiriting.",
        variant: "destructive"
      });
      return;
    }

    const collectionData: any = {
      name: collectionForm.name,
      description: collectionForm.description,
      thumbnailUrl: collectionForm.thumbnailUrl,
      category: collectionForm.category || collectionForm.categories[0] || '',
      categories: collectionForm.categories.length > 0 ? collectionForm.categories : [collectionForm.category],
      isFree: collectionForm.isFree === 'true',
      price: collectionForm.isFree === 'true' ? 0 : parseInt(collectionForm.price)
    };

    createCollectionMutation.mutate(collectionData);
  };

  const handleAddVideo = () => {
    if (!videoForm.title || !videoForm.videoUrl || !videoForm.duration || !videoForm.thumbnailUrl || !activeCollectionId) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring (nom, rasm, URL, davomiylik).",
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
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-create-collection">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Yangi To'plam Yaratish</DialogTitle>
            <DialogDescription>
              Yangi video to'plam ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
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
              <Label>Kategoriyalar *</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Hozircha kategoriyalar yo'q</p>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-cat-${category.id}`}
                        checked={collectionForm.categories.includes(category.name)}
                        onCheckedChange={() => toggleCategory(category.name)}
                        data-testid={`checkbox-collection-category-${category.name}`}
                      />
                      <label
                        htmlFor={`col-cat-${category.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.icon} {category.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {collectionForm.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {collectionForm.categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>To'plam turi *</Label>
              <RadioGroup 
                value={collectionForm.isFree} 
                onValueChange={(value) => setCollectionForm({ ...collectionForm, isFree: value })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="paid" data-testid="radio-paid" />
                  <Label htmlFor="paid" className="cursor-pointer font-normal">💰 Pullik</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="free" data-testid="radio-free" />
                  <Label htmlFor="free" className="cursor-pointer font-normal">🎁 Bepul</Label>
                </div>
              </RadioGroup>
            </div>

            {collectionForm.isFree === 'false' && (
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
            )}

            <div>
              <Label htmlFor="thumbnailFile">Rasm Yuklash *</Label>
              <div className="space-y-2">
                <Input
                  id="thumbnailFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleThumbnailUpload(file);
                    }
                  }}
                  disabled={uploadingThumbnail}
                  data-testid="input-collection-thumbnail"
                />
                {uploadingThumbnail && (
                  <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
                )}
                {collectionForm.thumbnailUrl && (
                  <div className="mt-2">
                    <img 
                      src={collectionForm.thumbnailUrl} 
                      alt="Preview" 
                      className="rounded-lg w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>
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
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Video Dialog */}
      <Dialog open={isAddVideoDialogOpen} onOpenChange={setIsAddVideoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-add-video">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Video Qo'shish</DialogTitle>
            <DialogDescription>
              To'plamga yangi video qo'shing
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
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
              <Label htmlFor="videoThumbnailFile">Video Rasmi *</Label>
              <div className="space-y-2">
                <Input
                  id="videoThumbnailFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleVideoThumbnailUpload(file);
                    }
                  }}
                  disabled={uploadingVideoThumbnail}
                  data-testid="input-video-thumbnail"
                />
                {uploadingVideoThumbnail && (
                  <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
                )}
                {videoForm.thumbnailUrl && (
                  <div className="mt-2">
                    <img 
                      src={videoForm.thumbnailUrl} 
                      alt="Preview" 
                      className="rounded-lg w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input
                id="videoUrl"
                value={videoForm.videoUrl}
                onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                placeholder="https://... (YouTube, Instagram, Telegram, va boshqalar)"
                data-testid="input-video-url"
              />
              <p className="text-xs text-muted-foreground mt-1">
                YouTube, Instagram, Telegram yoki har qanday platformadan video URL kiriting
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
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}