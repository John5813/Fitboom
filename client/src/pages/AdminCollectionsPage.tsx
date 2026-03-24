import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { VideoCollection, OnlineClass } from "@shared/schema";
import { CATEGORIES, type Category } from "@shared/categories";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Plus, ArrowLeft, Video, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function AdminCollectionsPage() {
  const [, setLocation] = useLocation();
  const [selectedCollection, setSelectedCollection] = useState<VideoCollection | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddVideoDialogOpen, setIsAddVideoDialogOpen] = useState(false);
  const [isEditVideoDialogOpen, setIsEditVideoDialogOpen] = useState(false);
  const [isViewVideoDialogOpen, setIsViewVideoDialogOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [viewingCollectionId, setViewingCollectionId] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<VideoCollection | null>(null);
  const [editingVideo, setEditingVideo] = useState<OnlineClass | null>(null);
  const [viewingVideo, setViewingVideo] = useState<OnlineClass | null>(null);
  const { toast } = useToast();

  const isVerified = sessionStorage.getItem('adminVerified') === 'true';
  useEffect(() => {
    if (!isVerified) setLocation('/admin');
  }, [isVerified]);

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
    queryKey: ['/api/admin/classes', activeCollectionId],
    queryFn: () => 
      fetch(`/api/admin/classes?collectionId=${activeCollectionId}`, {
        credentials: 'include'
      }).then(res => res.json()),
    enabled: !!activeCollectionId,
  });

  const { data: viewingVideosData } = useQuery<{ classes: OnlineClass[] }>({
    queryKey: ['/api/admin/classes', viewingCollectionId],
    queryFn: () => 
      fetch(`/api/admin/classes?collectionId=${viewingCollectionId}`, {
        credentials: 'include'
      }).then(res => res.json()),
    enabled: !!viewingCollectionId,
  });

  const collections = collectionsData?.collections || [];
  const collectionVideos = collectionVideosData?.classes || [];
  const viewingVideos = viewingVideosData?.classes || [];

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
      const response = await apiRequest('/api/admin/classes', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes', activeCollectionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes', viewingCollectionId] });
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

  const updateVideoMutation = useMutation({
    mutationFn: async (data: { id: string; updateData: any }) => {
      const response = await apiRequest(`/api/admin/classes/${data.id}`, 'PUT', data.updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes', viewingCollectionId] });
      toast({
        title: "Video yangilandi",
        description: "Video muvaffaqiyatli yangilandi.",
      });
      setIsEditVideoDialogOpen(false);
      setEditingVideo(null);
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
        description: "Video yangilashda xatolik yuz berdi.",
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

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/admin/classes/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes', viewingCollectionId] });
      toast({
        title: "Video o'chirildi",
        description: "Video muvaffaqiyatli o'chirildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Video o'chirishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteVideo = (id: string) => {
    if (confirm("Haqiqatan ham bu videoni o'chirmoqchimisiz?")) {
      deleteVideoMutation.mutate(id);
    }
  };

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/collections/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      toast({
        title: "To'plam o'chirildi",
        description: "Video to'plam muvaffaqiyatli o'chirildi.",
      });
      setSelectedCollection(null);
      setViewingCollectionId(null);
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "To'plam o'chirishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteCollection = (id: string) => {
    if (confirm("To'plamni va undagi barcha videolarni o'chirishni tasdiqlaysizmi?")) {
      deleteCollectionMutation.mutate(id);
    }
  };

  const updateCollectionMutation = useMutation({
    mutationFn: async (data: { id: string; updateData: any }) => {
      const response = await apiRequest(`/api/collections/${data.id}`, 'PUT', data.updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      toast({
        title: "To'plam yangilandi",
        description: "Video to'plam muvaffaqiyatli yangilandi.",
      });
      setIsEditDialogOpen(false);
      setEditingCollection(null);
      setCollectionForm({
        name: '',
        description: '',
        price: '',
        thumbnailUrl: '',
        category: '',
        categories: [],
        isFree: 'false',
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "To'plam yangilashda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handleEditCollection = (collection: VideoCollection) => {
    setEditingCollection(collection);
    setCollectionForm({
      name: collection.name,
      description: collection.description || '',
      price: collection.price.toString(),
      thumbnailUrl: collection.thumbnailUrl,
      category: collection.categories?.[0] || '',
      categories: collection.categories || [],
      isFree: collection.isFree ? 'true' : 'false',
    });
    setIsEditDialogOpen(true);
    setSelectedCollection(null);
    setViewingCollectionId(null);
  };

  const handleUpdateCollection = () => {
    if (!editingCollection) return;

    if (!collectionForm.name || (!collectionForm.category && collectionForm.categories.length === 0)) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, nomi va kategoriyani kiriting.",
        variant: "destructive"
      });
      return;
    }

    const updateData: any = {
      name: collectionForm.name,
      description: collectionForm.description,
      thumbnailUrl: collectionForm.thumbnailUrl,
      category: collectionForm.category || collectionForm.categories[0] || '',
      categories: collectionForm.categories.length > 0 ? collectionForm.categories : [collectionForm.category],
      isFree: collectionForm.isFree === 'true',
      price: collectionForm.isFree === 'true' ? 0 : parseInt(collectionForm.price)
    };

    updateCollectionMutation.mutate({ id: editingCollection.id, updateData });
  };

  const openAddVideoDialog = (collectionId: string) => {
    setActiveCollectionId(collectionId);
    setIsAddVideoDialogOpen(true);
  };

  const handleEditVideo = (video: OnlineClass) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      videoUrl: video.videoUrl,
      duration: video.duration.toString(),
      instructor: video.instructor || '',
      thumbnailUrl: video.thumbnailUrl,
    });
    setIsEditVideoDialogOpen(true);
  };

  const handleUpdateVideo = () => {
    if (!editingVideo) return;

    if (!videoForm.title || !videoForm.videoUrl || !videoForm.duration || !videoForm.thumbnailUrl) {
      toast({
        title: "Ma'lumot to'liq emas",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring.",
        variant: "destructive"
      });
      return;
    }

    const updateData = {
      title: videoForm.title,
      description: videoForm.description,
      videoUrl: videoForm.videoUrl,
      duration: parseInt(videoForm.duration),
      instructor: videoForm.instructor,
      thumbnailUrl: videoForm.thumbnailUrl,
    };

    updateVideoMutation.mutate({ id: editingVideo.id, updateData });
  };

  const handleViewVideo = (video: OnlineClass) => {
    setViewingVideo(video);
    setIsViewVideoDialogOpen(true);
  };

  if (!isVerified) return null;

  const freeCount = collections.filter(c => c.isFree).length;
  const paidCount = collections.length - freeCount;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-blue-200/70 hover:text-white hover:bg-white/10 h-9 w-9" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Video To'plamlar</h1>
                <p className="text-blue-200/60 text-sm">{collections.length} ta to'plam</p>
              </div>
            </div>
            <Button size="sm" className="bg-white/15 hover:bg-white/25 text-white border-0" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-collection">
              <Plus className="h-4 w-4 mr-1" />
              Yangi
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-3">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Video className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[11px] text-muted-foreground">Jami</span>
            </div>
            <p className="text-xl font-bold">{collections.length}</p>
          </div>
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-emerald-500 font-bold">$</span>
              <span className="text-[11px] text-muted-foreground">Pullik</span>
            </div>
            <p className="text-xl font-bold">{paidCount}</p>
          </div>
          <div className="rounded-xl bg-card border shadow-sm p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-blue-500 font-bold">F</span>
              <span className="text-[11px] text-muted-foreground">Bepul</span>
            </div>
            <p className="text-xl font-bold">{freeCount}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">To'plamlar topilmadi</p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Birinchi to'plamni yarating
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 border cursor-pointer"
                data-testid={`card-collection-${collection.id}`}
                onClick={() => {
                  setViewingCollectionId(collection.id);
                  setSelectedCollection(collection);
                }}
              >
                <div className="relative h-40">
                  {collection.thumbnailUrl ? (
                    <img src={collection.thumbnailUrl} alt={collection.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center">
                      <Video className="h-12 w-12 text-violet-400/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <h3 className="font-semibold text-white text-base truncate mr-2" data-testid={`text-collection-name-${collection.id}`}>
                      {collection.name}
                    </h3>
                    {collection.isFree ? (
                      <Badge className="bg-emerald-500 text-white border-0 shrink-0 text-[10px]">Bepul</Badge>
                    ) : (
                      <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 shrink-0 text-[10px]">{collection.price?.toLocaleString()} sum</Badge>
                    )}
                  </div>
                </div>
                <div className="p-3.5">
                  {collection.description && (
                    <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2">{collection.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Video className="h-3.5 w-3.5" />
                      <span>{(collection as any).videoCount || 0} ta video</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); openAddVideoDialog(collection.id); }} data-testid={`button-add-video-${collection.id}`}>
                        <Plus className="h-3 w-3 mr-1" />
                        Video
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedCollection} onOpenChange={(open) => {
        if (!open) {
          setSelectedCollection(null);
          setViewingCollectionId(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0" data-testid="dialog-collection-detail">
          {selectedCollection?.thumbnailUrl ? (
            <div className="relative h-40">
              <img src={selectedCollection.thumbnailUrl} alt={selectedCollection.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <DialogHeader>
                  <DialogTitle className="text-white text-lg">{selectedCollection?.name}</DialogTitle>
                  <DialogDescription className="text-white/70 text-xs">
                    {selectedCollection?.isFree ? 'Bepul' : `${selectedCollection?.price?.toLocaleString()} sum`} · {viewingVideos.length} ta video
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-5 text-white">
              <DialogHeader>
                <DialogTitle className="text-white text-lg">{selectedCollection?.name}</DialogTitle>
                <DialogDescription className="text-violet-100/80 text-xs">
                  {selectedCollection?.isFree ? 'Bepul' : `${selectedCollection?.price?.toLocaleString()} sum`} · {viewingVideos.length} ta video
                </DialogDescription>
              </DialogHeader>
            </div>
          )}

          {selectedCollection && (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-5 overflow-x-hidden">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditCollection(selectedCollection)} data-testid="button-edit-collection">
                    Tahrirlash
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteCollection(selectedCollection.id)} data-testid="button-delete-collection">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    O'chirish
                  </Button>
                </div>

                {selectedCollection.description && (
                  <p className="text-sm text-muted-foreground">{selectedCollection.description}</p>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Videolar</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        openAddVideoDialog(selectedCollection.id);
                        setSelectedCollection(null);
                        setViewingCollectionId(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Video qo'shish
                    </Button>
                  </div>

                  {viewingVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Bu to'plamda videolar yo'q
                    </p>
                  ) : (
                    <ScrollArea className="h-[400px] w-full">
                      <div className="w-full">
                        <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">№</TableHead>
                            <TableHead className="w-[70px]">Rasm</TableHead>
                            <TableHead className="flex-1">Nomi</TableHead>
                            <TableHead className="w-[80px]">Vaqt</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingVideos.map((video, index) => (
                            <TableRow 
                              key={video.id} 
                              data-testid={`video-item-${video.id}`}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleEditVideo(video)}
                            >
                              <TableCell className="font-medium text-sm">{index + 1}</TableCell>
                              <TableCell className="p-2">
                                {video.thumbnailUrl ? (
                                  <img
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    className="w-12 h-9 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-9 bg-muted rounded flex items-center justify-center">
                                    <Video className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm line-clamp-1">{video.title}</p>
                                  {video.instructor && (
                                    <p className="text-xs text-muted-foreground truncate">{video.instructor}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {video.duration} daq
                              </TableCell>
                              <TableCell className="p-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVideo(video.id);
                                  }}
                                  data-testid={`button-delete-video-${video.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </ScrollArea>
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
                {CATEGORIES.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Hozircha kategoriyalar yo'q</p>
                ) : (
                  CATEGORIES.map((category) => (
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
                <Label htmlFor="price">Narxi (sum)</Label>
                <Input
                  id="price"
                  type="number"
                  value={collectionForm.price}
                  onChange={(e) => setCollectionForm({ ...collectionForm, price: e.target.value })}
                  placeholder="Narxi (sum)"
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

      {/* Edit Collection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-edit-collection">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">To'plamni Tahrirlash</DialogTitle>
            <DialogDescription>
              Video to'plam ma'lumotlarini yangilang
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">To'plam nomi *</Label>
                <Input
                  id="edit-name"
                  value={collectionForm.name}
                  onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                  placeholder="Misol: Beginner Yoga Course"
                  data-testid="input-edit-collection-name"
                />
              </div>

              <div>
                <Label>Kategoriyalar *</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {CATEGORIES.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-cat-${category.id}`}
                        checked={collectionForm.categories.includes(category.name)}
                        onCheckedChange={() => toggleCategory(category.name)}
                      />
                      <label htmlFor={`edit-cat-${category.id}`} className="text-sm cursor-pointer">
                        {category.icon} {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>To'plam turi *</Label>
                <RadioGroup value={collectionForm.isFree} onValueChange={(value) => setCollectionForm({ ...collectionForm, isFree: value })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="edit-paid" />
                    <Label htmlFor="edit-paid" className="cursor-pointer">Pullik</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="edit-free" />
                    <Label htmlFor="edit-free" className="cursor-pointer">Bepul</Label>
                  </div>
                </RadioGroup>
              </div>

              {collectionForm.isFree === 'false' && (
                <div>
                  <Label htmlFor="edit-price">Narxi (sum)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={collectionForm.price}
                    onChange={(e) => setCollectionForm({ ...collectionForm, price: e.target.value })}
                    placeholder="Narxi (sum)"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="edit-description">Tavsif</Label>
                <Textarea
                  id="edit-description"
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  placeholder="To'plam haqida qisqacha ma'lumot..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpdateCollection}
                  disabled={updateCollectionMutation.isPending}
                  className="flex-1"
                >
                  {updateCollectionMutation.isPending ? 'Yuklanmoqda...' : "Saqlash"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Bekor qilish
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog open={isEditVideoDialogOpen} onOpenChange={setIsEditVideoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-edit-video">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Videoni Tahrirlash</DialogTitle>
            <DialogDescription>
              Video ma'lumotlarini yangilang
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-video-title">Video nomi *</Label>
                <Input
                  id="edit-video-title"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  placeholder="Misol: Day 1: Introduction to Yoga"
                />
              </div>

              <div>
                <Label htmlFor="edit-videoThumbnailFile">Video Rasmi *</Label>
                <div className="space-y-2">
                  <Input
                    id="edit-videoThumbnailFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleVideoThumbnailUpload(file);
                      }
                    }}
                    disabled={uploadingVideoThumbnail}
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
                <Label htmlFor="edit-videoUrl">Video URL *</Label>
                <Input
                  id="edit-videoUrl"
                  value={videoForm.videoUrl}
                  onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                  placeholder="https://... (YouTube, Instagram, Telegram, va boshqalar)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  YouTube, Instagram, Telegram yoki har qanday platformadan video URL kiriting
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-duration">Davomiyligi (daqiqa) *</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={videoForm.duration}
                    onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })}
                    placeholder="45"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-instructor">Instructor</Label>
                  <Input
                    id="edit-instructor"
                    value={videoForm.instructor}
                    onChange={(e) => setVideoForm({ ...videoForm, instructor: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-videoDescription">Tavsif</Label>
                <Textarea
                  id="edit-videoDescription"
                  value={videoForm.description}
                  onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                  placeholder="Video haqida qisqacha ma'lumot..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpdateVideo}
                  disabled={updateVideoMutation.isPending}
                  className="flex-1"
                >
                  {updateVideoMutation.isPending ? 'Yuklanmoqda...' : "Saqlash"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleViewVideo(editingVideo!)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ko'rish
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditVideoDialogOpen(false)}
                >
                  Yopish
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Video Dialog */}
      <Dialog open={isViewVideoDialogOpen} onOpenChange={setIsViewVideoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-view-video">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{viewingVideo?.title}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            {viewingVideo && (
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {viewingVideo.videoUrl.includes('youtube.com') || viewingVideo.videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={viewingVideo.videoUrl.includes('youtube.com/watch') 
                        ? `https://www.youtube.com/embed/${new URL(viewingVideo.videoUrl).searchParams.get('v')}`
                        : viewingVideo.videoUrl.includes('youtu.be/')
                        ? `https://www.youtube.com/embed/${viewingVideo.videoUrl.split('youtu.be/')[1].split('?')[0]}`
                        : viewingVideo.videoUrl
                      }
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : viewingVideo.videoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={viewingVideo.videoUrl.includes('player.vimeo.com/video/')
                        ? viewingVideo.videoUrl
                        : `https://player.vimeo.com/video/${viewingVideo.videoUrl.split('vimeo.com/')[1].split('?')[0].split('/').pop()}`
                      }
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <iframe
                      src={viewingVideo.videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>

                {viewingVideo.description && (
                  <div>
                    <Label>Tavsif</Label>
                    <p className="text-sm text-muted-foreground mt-1">{viewingVideo.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Davomiyligi</Label>
                    <p className="text-sm font-medium">{viewingVideo.duration} daqiqa</p>
                  </div>
                  {viewingVideo.instructor && (
                    <div>
                      <Label>Instructor</Label>
                      <p className="text-sm font-medium">{viewingVideo.instructor}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setIsViewVideoDialogOpen(false);
                      handleEditVideo(viewingVideo);
                    }}
                    className="flex-1"
                  >
                    Tahrirlash
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsViewVideoDialogOpen(false)}
                    className="flex-1"
                  >
                    Yopish
                  </Button>
                </div>
              </div>
            )}
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