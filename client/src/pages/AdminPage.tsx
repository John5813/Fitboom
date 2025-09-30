import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Gym } from "@shared/schema";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('gyms');
  const { toast } = useToast();
  const [editingGym, setEditingGym] = useState<Gym | null>(null);

  // Gym form state
  const [gymForm, setGymForm] = useState({
    name: '',
    address: '',
    description: '',
    credits: '',
    category: '',
    imageUrl: '',
    facilities: '',
    rating: '5',
    distance: '',
    hours: ''
  });

  // Class form state
  const [classForm, setClassForm] = useState({
    title: '',
    category: '',
    duration: '',
    instructor: '',
    thumbnailUrl: '',
    videoUrl: ''
  });

  // Fetch all gyms
  const { data: gymsData, isLoading: gymsLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  // Fetch all classes
  const { data: classesData, isLoading: classesLoading } = useQuery<{ classes: any[] }>({
    queryKey: ['/api/classes'],
  });

  const classes = classesData?.classes || [];

  // Create gym mutation
  const createGymMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/gyms', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({
        title: "Sport zal qo'shildi",
        description: `${gymForm.name} muvaffaqiyatli qo'shildi.`,
      });
      resetGymForm();
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Sport zal qo'shishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  // Update gym mutation
  const updateGymMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return apiRequest(`/api/gyms/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({
        title: "Sport zal yangilandi",
        description: "Ma'lumotlar muvaffaqiyatli yangilandi.",
      });
      setEditingGym(null);
      resetGymForm();
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Sport zal yangilashda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  // Delete gym mutation
  const deleteGymMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/gyms/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({
        title: "Sport zal o'chirildi",
        description: "Sport zal muvaffaqiyatli o'chirildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Sport zal o'chirishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const resetGymForm = () => {
    setGymForm({
      name: '',
      address: '',
      description: '',
      credits: '',
      category: '',
      imageUrl: '',
      facilities: '',
      rating: '5',
      distance: '',
      hours: ''
    });
  };

  const handleAddOrUpdateGym = () => {
    // Validate required fields with proper whitespace handling
    const trimmedName = gymForm.name.trim();
    if (!trimmedName || trimmedName.length === 0) {
      toast({
        title: "Xatolik",
        description: "Zal nomini kiriting.",
        variant: "destructive"
      });
      return;
    }

    if (!gymForm.category) {
      toast({
        title: "Xatolik",
        description: "Kategoriyani tanlang.",
        variant: "destructive"
      });
      return;
    }

    const trimmedAddress = gymForm.address.trim();
    if (!trimmedAddress || trimmedAddress.length === 0) {
      toast({
        title: "Xatolik",
        description: "Manzilni kiriting.",
        variant: "destructive"
      });
      return;
    }

    const trimmedImageUrl = gymForm.imageUrl.trim();
    if (!trimmedImageUrl || trimmedImageUrl.length === 0) {
      toast({
        title: "Xatolik",
        description: "Rasm URL ni kiriting.",
        variant: "destructive"
      });
      return;
    }

    // Validate credits - must be a valid positive integer (no decimals)
    const creditsStr = gymForm.credits.trim();
    if (!/^\d+$/.test(creditsStr)) {
      toast({
        title: "Xatolik",
        description: "Kredit faqat butun son bo'lishi kerak.",
        variant: "destructive"
      });
      return;
    }
    const creditsValue = parseInt(creditsStr, 10);
    if (creditsValue < 0) {
      toast({
        title: "Xatolik",
        description: "Kredit manfiy bo'lishi mumkin emas.",
        variant: "destructive"
      });
      return;
    }

    // Validate distance and hours - required fields
    const trimmedDistance = gymForm.distance.trim();
    if (!trimmedDistance || trimmedDistance.length === 0) {
      toast({
        title: "Xatolik",
        description: "Masofani kiriting (masalan: 1.2 km).",
        variant: "destructive"
      });
      return;
    }

    const trimmedHours = gymForm.hours.trim();
    if (!trimmedHours || trimmedHours.length === 0) {
      toast({
        title: "Xatolik",
        description: "Ish vaqtini kiriting (masalan: 06:00 - 23:00).",
        variant: "destructive"
      });
      return;
    }

    const trimmedDescription = gymForm.description.trim();
    const trimmedFacilities = gymForm.facilities.trim();

    const gymData = {
      name: trimmedName,
      address: trimmedAddress,
      description: trimmedDescription || null,
      credits: creditsValue,
      category: gymForm.category,
      imageUrl: trimmedImageUrl,
      facilities: trimmedFacilities || null,
      rating: parseInt(gymForm.rating, 10),
      distance: trimmedDistance,
      hours: trimmedHours
    };

    if (editingGym) {
      updateGymMutation.mutate({ id: editingGym.id, data: gymData });
    } else {
      createGymMutation.mutate(gymData);
    }
  };

  const handleEditGym = (gym: Gym) => {
    setEditingGym(gym);
    setGymForm({
      name: gym.name,
      address: gym.address,
      description: gym.description || '',
      credits: gym.credits.toString(),
      category: gym.category,
      imageUrl: gym.imageUrl,
      facilities: gym.facilities || '',
      rating: gym.rating.toString(),
      distance: gym.distance,
      hours: gym.hours
    });
  };

  const handleDeleteGym = (id: string) => {
    if (window.confirm("Haqiqatan ham bu zalni o'chirmoqchimisiz?")) {
      deleteGymMutation.mutate(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingGym(null);
    resetGymForm();
  };

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/classes', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({
        title: "Online dars qo'shildi",
        description: `${classForm.title} muvaffaqiyatli qo'shildi.`,
      });
      setClassForm({
        title: '',
        category: '',
        duration: '',
        instructor: '',
        thumbnailUrl: '',
        videoUrl: ''
      });
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/classes/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({
        title: "Dars o'chirildi",
        description: "Online dars muvaffaqiyatli o'chirildi.",
      });
    },
  });

  const handleAddClass = () => {
    createClassMutation.mutate(classForm);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/home">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Orqaga
            </Button>
          </Link>
          <h1 className="font-display font-bold text-3xl">Admin Panel</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'gyms' ? 'default' : 'outline'}
            onClick={() => setActiveTab('gyms')}
            data-testid="button-tab-gyms"
          >
            Sport Zallar
          </Button>
          <Button
            variant={activeTab === 'classes' ? 'default' : 'outline'}
            onClick={() => setActiveTab('classes')}
            data-testid="button-tab-classes"
          >
            Online Darslar
          </Button>
        </div>

        {/* Gym Management */}
        {activeTab === 'gyms' && (
          <div className="space-y-6">
            {/* Add/Edit Gym Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {editingGym ? "Sport Zalni Tahrirlash" : "Yangi Sport Zal Qo'shish"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gym-name">Zal nomi</Label>
                    <Input
                      id="gym-name"
                      value={gymForm.name}
                      onChange={(e) => setGymForm({...gymForm, name: e.target.value})}
                      placeholder="PowerFit Gym"
                      data-testid="input-gym-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gym-category">Kategoriya</Label>
                    <Select 
                      value={gymForm.category}
                      onValueChange={(value) => setGymForm({...gymForm, category: value})}
                    >
                      <SelectTrigger data-testid="select-gym-category">
                        <SelectValue placeholder="Kategoriya tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gym">Gym</SelectItem>
                        <SelectItem value="Suzish">Suzish</SelectItem>
                        <SelectItem value="Yoga">Yoga</SelectItem>
                        <SelectItem value="Boks">Boks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="gym-price">Narx (kredit)</Label>
                    <Input
                      id="gym-price"
                      type="number"
                      value={gymForm.credits}
                      onChange={(e) => setGymForm({...gymForm, credits: e.target.value})}
                      placeholder="4"
                      data-testid="input-gym-credits"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gym-rating">Reyting</Label>
                    <Select 
                      value={gymForm.rating} 
                      onValueChange={(value) => setGymForm({...gymForm, rating: value})}
                    >
                      <SelectTrigger data-testid="select-gym-rating">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="gym-distance">Masofa</Label>
                    <Input
                      id="gym-distance"
                      value={gymForm.distance}
                      onChange={(e) => setGymForm({...gymForm, distance: e.target.value})}
                      placeholder="1.2 km"
                      data-testid="input-gym-distance"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gym-hours">Ish vaqti</Label>
                    <Input
                      id="gym-hours"
                      value={gymForm.hours}
                      onChange={(e) => setGymForm({...gymForm, hours: e.target.value})}
                      placeholder="06:00 - 23:00"
                      data-testid="input-gym-hours"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="gym-address">Manzil</Label>
                  <Input
                    id="gym-address"
                    value={gymForm.address}
                    onChange={(e) => setGymForm({...gymForm, address: e.target.value})}
                    placeholder="Amir Temur ko'chasi"
                    data-testid="input-gym-address"
                  />
                </div>
                
                <div>
                  <Label htmlFor="gym-description">Tavsif</Label>
                  <Textarea
                    id="gym-description"
                    value={gymForm.description}
                    onChange={(e) => setGymForm({...gymForm, description: e.target.value})}
                    placeholder="Zal haqida qisqacha ma'lumot"
                    data-testid="input-gym-description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="gym-image">Rasm URL</Label>
                  <Input
                    id="gym-image"
                    value={gymForm.imageUrl}
                    onChange={(e) => setGymForm({...gymForm, imageUrl: e.target.value})}
                    placeholder="https://example.com/gym.jpg"
                    data-testid="input-gym-image"
                  />
                </div>
                
                <div>
                  <Label htmlFor="gym-facilities">Imkoniyatlar (vergul bilan ajratib yozing)</Label>
                  <Input
                    id="gym-facilities"
                    value={gymForm.facilities}
                    onChange={(e) => setGymForm({...gymForm, facilities: e.target.value})}
                    placeholder="Kardio, Og'irlik ko'tarish, Sauna"
                    data-testid="input-gym-facilities"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddOrUpdateGym} 
                    className="flex-1"
                    disabled={createGymMutation.isPending || updateGymMutation.isPending}
                    data-testid="button-save-gym"
                  >
                    {editingGym ? "Saqlash" : "Sport Zal Qo'shish"}
                  </Button>
                  {editingGym && (
                    <Button 
                      onClick={handleCancelEdit} 
                      variant="outline"
                      data-testid="button-cancel-edit"
                    >
                      Bekor qilish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Existing Gyms List */}
            <Card>
              <CardHeader>
                <CardTitle>Mavjud Sport Zallar</CardTitle>
              </CardHeader>
              <CardContent>
                {gymsLoading ? (
                  <p className="text-muted-foreground">Yuklanmoqda...</p>
                ) : gyms && gyms.length > 0 ? (
                  <div className="space-y-3">
                    {gyms.map((gym) => (
                      <div 
                        key={gym.id} 
                        className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                        data-testid={`card-gym-${gym.id}`}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg" data-testid={`text-gym-name-${gym.id}`}>
                            {gym.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {gym.category} • {gym.credits} kredit • {gym.address}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {gym.distance} • {gym.hours}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditGym(gym)}
                            data-testid={`button-edit-gym-${gym.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteGym(gym.id)}
                            disabled={deleteGymMutation.isPending}
                            data-testid={`button-delete-gym-${gym.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Hali sport zallar qo'shilmagan.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Class Management */}
        {activeTab === 'classes' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Yangi Online Dars Qo'shish
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class-title">Dars nomi</Label>
                  <Input
                    id="class-title"
                    value={classForm.title}
                    onChange={(e) => setClassForm({...classForm, title: e.target.value})}
                    placeholder="HIIT Mashq"
                    data-testid="input-class-title"
                  />
                </div>
                <div>
                  <Label htmlFor="class-category">Kategoriya</Label>
                  <Select onValueChange={(value) => setClassForm({...classForm, category: value})}>
                    <SelectTrigger data-testid="select-class-category">
                      <SelectValue placeholder="Kategoriya tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cardio">Cardio</SelectItem>
                      <SelectItem value="Yoga">Yoga</SelectItem>
                      <SelectItem value="Strength">Strength</SelectItem>
                      <SelectItem value="Flexibility">Flexibility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class-duration">Davomiyligi</Label>
                  <Input
                    id="class-duration"
                    value={classForm.duration}
                    onChange={(e) => setClassForm({...classForm, duration: e.target.value})}
                    placeholder="30 min"
                    data-testid="input-class-duration"
                  />
                </div>
                <div>
                  <Label htmlFor="class-instructor">Instruktor</Label>
                  <Input
                    id="class-instructor"
                    value={classForm.instructor}
                    onChange={(e) => setClassForm({...classForm, instructor: e.target.value})}
                    placeholder="Aziza Karimova"
                    data-testid="input-class-instructor"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="class-thumbnail">Rasm URL</Label>
                <Input
                  id="class-thumbnail"
                  value={classForm.thumbnailUrl}
                  onChange={(e) => setClassForm({...classForm, thumbnailUrl: e.target.value})}
                  placeholder="https://example.com/class.jpg"
                  data-testid="input-class-thumbnail"
                />
              </div>
              
              <div>
                <Label htmlFor="class-video">Video URL</Label>
                <Input
                  id="class-video"
                  value={classForm.videoUrl}
                  onChange={(e) => setClassForm({...classForm, videoUrl: e.target.value})}
                  placeholder="https://example.com/video.mp4"
                  data-testid="input-class-video"
                />
              </div>
              
              <Button 
                onClick={handleAddClass} 
                className="w-full"
                data-testid="button-add-class"
                disabled={createClassMutation.isPending}
              >
                {createClassMutation.isPending ? 'Qo\'shilmoqda...' : 'Online Dars Qo\'shish'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Classes List */}
        {activeTab === 'classes' && (
          <Card>
            <CardHeader>
              <CardTitle>Mavjud Online Darslar</CardTitle>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <p className="text-muted-foreground">Yuklanmoqda...</p>
              ) : classes.length > 0 ? (
                <div className="space-y-4">
                  {classes.map((classItem) => (
                    <div key={classItem.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {classItem.thumbnailUrl && (
                          <img 
                            src={classItem.thumbnailUrl} 
                            alt={classItem.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold">{classItem.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {classItem.category} • {classItem.duration} • {classItem.instructor}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteClassMutation.mutate(classItem.id)}
                        disabled={deleteClassMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Hali online darslar qo'shilmagan.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
