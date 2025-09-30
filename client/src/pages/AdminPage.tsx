
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('gyms');
  const { toast } = useToast();

  // Gym form state
  const [gymForm, setGymForm] = useState({
    name: '',
    address: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    facilities: '',
    rating: '5'
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

  const handleAddGym = () => {
    // TODO: API call to add gym
    toast({
      title: "Sport zal qo'shildi",
      description: `${gymForm.name} muvaffaqiyatli qo'shildi.`,
    });
    setGymForm({
      name: '',
      address: '',
      description: '',
      price: '',
      category: '',
      imageUrl: '',
      facilities: '',
      rating: '5'
    });
  };

  const handleAddClass = () => {
    // TODO: API call to add class
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
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/home">
            <Button variant="outline" size="sm">
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
          >
            Sport Zallar
          </Button>
          <Button
            variant={activeTab === 'classes' ? 'default' : 'outline'}
            onClick={() => setActiveTab('classes')}
          >
            Online Darslar
          </Button>
        </div>

        {/* Gym Management */}
        {activeTab === 'gyms' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Yangi Sport Zal Qo'shish
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
                  />
                </div>
                <div>
                  <Label htmlFor="gym-category">Kategoriya</Label>
                  <Select onValueChange={(value) => setGymForm({...gymForm, category: value})}>
                    <SelectTrigger>
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
                    value={gymForm.price}
                    onChange={(e) => setGymForm({...gymForm, price: e.target.value})}
                    placeholder="4"
                  />
                </div>
                <div>
                  <Label htmlFor="gym-rating">Reyting</Label>
                  <Select value={gymForm.rating} onValueChange={(value) => setGymForm({...gymForm, rating: value})}>
                    <SelectTrigger>
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
              </div>
              
              <div>
                <Label htmlFor="gym-address">Manzil</Label>
                <Input
                  id="gym-address"
                  value={gymForm.address}
                  onChange={(e) => setGymForm({...gymForm, address: e.target.value})}
                  placeholder="Amir Temur ko'chasi"
                />
              </div>
              
              <div>
                <Label htmlFor="gym-description">Tavsif</Label>
                <Textarea
                  id="gym-description"
                  value={gymForm.description}
                  onChange={(e) => setGymForm({...gymForm, description: e.target.value})}
                  placeholder="Zal haqida qisqacha ma'lumot"
                />
              </div>
              
              <div>
                <Label htmlFor="gym-image">Rasm URL</Label>
                <Input
                  id="gym-image"
                  value={gymForm.imageUrl}
                  onChange={(e) => setGymForm({...gymForm, imageUrl: e.target.value})}
                  placeholder="https://example.com/gym.jpg"
                />
              </div>
              
              <div>
                <Label htmlFor="gym-facilities">Imkoniyatlar (vergul bilan ajratib yozing)</Label>
                <Input
                  id="gym-facilities"
                  value={gymForm.facilities}
                  onChange={(e) => setGymForm({...gymForm, facilities: e.target.value})}
                  placeholder="Kardio, Og'irlik ko'tarish, Sauna"
                />
              </div>
              
              <Button onClick={handleAddGym} className="w-full">
                Sport Zal Qo'shish
              </Button>
            </CardContent>
          </Card>
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
                  />
                </div>
                <div>
                  <Label htmlFor="class-category">Kategoriya</Label>
                  <Select onValueChange={(value) => setClassForm({...classForm, category: value})}>
                    <SelectTrigger>
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
                  />
                </div>
                <div>
                  <Label htmlFor="class-instructor">Instruktor</Label>
                  <Input
                    id="class-instructor"
                    value={classForm.instructor}
                    onChange={(e) => setClassForm({...classForm, instructor: e.target.value})}
                    placeholder="Aziza Karimova"
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
                />
              </div>
              
              <div>
                <Label htmlFor="class-video">Video URL</Label>
                <Input
                  id="class-video"
                  value={classForm.videoUrl}
                  onChange={(e) => setClassForm({...classForm, videoUrl: e.target.value})}
                  placeholder="https://example.com/video.mp4"
                />
              </div>
              
              <Button onClick={handleAddClass} className="w-full">
                Online Dars Qo'shish
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
