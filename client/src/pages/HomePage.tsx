import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import CreditBalance from "@/components/CreditBalance";
import GymCard from "@/components/GymCard";
import GymFilters from "@/components/GymFilters";
import OnlineClassCard from "@/components/OnlineClassCard";
import BookingCard from "@/components/BookingCard";
import BottomNav from "@/components/BottomNav";
import PurchaseCreditsDialog from "@/components/PurchaseCreditsDialog";
import QRScanner from "@/components/QRScanner";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { Gym } from "@shared/schema";

import gymImage from "@assets/generated_images/Standard_gym_facility_interior_f255ae25.png";
import poolImage from "@assets/generated_images/Swimming_pool_facility_9aea752a.png";
import yogaImage from "@assets/generated_images/Yoga_studio_space_83aaaeab.png";
import classImage from "@assets/generated_images/Online_fitness_class_instructor_ef28ee4a.png";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('home');
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const credits = user?.credits || 0;

  // Fetch gyms from API
  const { data: gymsData, isLoading: gymsLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  // Fallback images for gyms based on category
  const getGymImage = (category: string) => {
    switch (category.toLowerCase()) {
      case 'suzish':
        return poolImage;
      case 'yoga':
        return yogaImage;
      default:
        return gymImage;
    }
  };

  // Fetch online classes from API
  const { data: classesData, isLoading: classesLoading } = useQuery<{ classes: any[] }>({
    queryKey: ['/api/classes'],
  });

  const onlineClasses = classesData?.classes || [];

  // todo: remove mock functionality - Mock bookings
  const [bookings, setBookings] = useState([]);

  const filteredGyms = gyms.filter(gym => {
    const matchesCategory = selectedCategory === 'all' || gym.category === selectedCategory;
    const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const bookGymMutation = useMutation({
    mutationFn: async (gymId: string) => {
      const response = await fetch('/api/book-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gymId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data, gymId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      const gym = gyms.find(g => g.id === gymId);
      
      // Add new booking
      const newBooking = {
        id: `booking_${Date.now()}`,
        gymName: gym?.name || '',
        gymImage: gym?.imageUrl || getGymImage(gym?.category || ''),
        date: new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
        time: '18:00',
        qrCode: `qr_${Date.now()}`
      };
      setBookings([...bookings, newBooking]);
      
      toast({
        title: "Muvaffaqiyatli bron qilindi!",
        description: `${gym?.name} uchun ${gym?.credits} kredit ishlatildi.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBookGym = (gymId: string) => {
    bookGymMutation.mutate(gymId);
  };

  const handleCancelBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      // Remove booking from list
      setBookings(bookings.filter(b => b.id !== bookingId));
      
      toast({
        title: "Bron bekor qilindi",
        description: "Kreditingiz qaytarildi.",
      });
    }
  };

  const purchaseMutation = useMutation({
    mutationFn: async (data: { credits: number; price: number }) => {
      const response = await fetch('/api/purchase-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Xarid amalga oshmadi');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Muvaffaqiyatli!",
        description: `${data.credits} kredit sotib olindi.`,
      });
      setIsPurchaseDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Kredit sotib olishda xatolik yuz berdi.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (creditAmount: number, price: number) => {
    purchaseMutation.mutate({ credits: creditAmount, price });
  };

  const handleScanQR = (data: string) => {
    toast({
      title: "QR kod skaner qilindi",
      description: "Zalga tashrif tasdiqlandi!",
    });
  };

  const categories = ['Gym', 'Suzish', 'Yoga', 'Boks'];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Home Tab */}
      {activeTab === 'home' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-3xl mb-2">FitBoom</h1>
              <p className="text-muted-foreground">Sport hayotingizni boshqaring</p>
            </div>
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="button-admin-panel">
                Admin Panel
              </Button>
            </Link>
          </div>
          
          <CreditBalance 
            credits={credits}
            onPurchase={() => setIsPurchaseDialogOpen(true)}
          />

          <div>
            <h2 className="font-display font-semibold text-xl mb-4">Yaqin atrofdagi zallar</h2>
            {gymsLoading ? (
              <p className="text-muted-foreground">Yuklanmoqda...</p>
            ) : gyms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gyms.slice(0, 3).map((gym) => (
                  <GymCard 
                    key={gym.id}
                    id={gym.id}
                    name={gym.name}
                    category={gym.category}
                    credits={gym.credits}
                    distance={gym.distance}
                    hours={gym.hours}
                    imageUrl={gym.imageUrl || getGymImage(gym.category)}
                    onBook={handleBookGym}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Hali sport zallar qo'shilmagan. Admin paneldan qo'shing.</p>
            )}
          </div>
        </div>
      )}

      {/* Gyms Tab */}
      {activeTab === 'gyms' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">Sport Zallari</h1>
          
          <GymFilters 
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {gymsLoading ? (
            <p className="text-muted-foreground">Yuklanmoqda...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGyms.map((gym) => (
                  <GymCard 
                    key={gym.id}
                    id={gym.id}
                    name={gym.name}
                    category={gym.category}
                    credits={gym.credits}
                    distance={gym.distance}
                    hours={gym.hours}
                    imageUrl={gym.imageUrl || getGymImage(gym.category)}
                    onBook={handleBookGym}
                  />
                ))}
              </div>

              {filteredGyms.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Hech qanday zal topilmadi</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">Online Darslar</h1>
          
          {classesLoading ? (
            <p className="text-muted-foreground">Yuklanmoqda...</p>
          ) : onlineClasses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineClasses.map((classItem) => (
              <OnlineClassCard 
                key={classItem.id}
                {...classItem}
                isLocked={credits === 0}
                onClick={(id) => {
                  if (credits > 0) {
                    toast({
                      title: "Dars boshlanmoqda",
                      description: classItem.title,
                    });
                  } else {
                    toast({
                      title: "Kredit kerak",
                      description: "Online darslarni ko'rish uchun kredit sotib oling.",
                      variant: "destructive",
                    });
                  }
                }}
              />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Hali online darslar qo'shilmagan. Admin paneldan qo'shing.</p>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">Mening Bronlarim</h1>
          
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingCard 
                key={booking.id}
                {...booking}
                onScanQR={() => setIsScannerOpen(true)}
                onCancel={handleCancelBooking}
              />
            ))}
          </div>

          {bookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Bronlar yo'q</p>
            </div>
          )}
        </div>
      )}

      <BottomNav 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onScanQR={() => setIsScannerOpen(true)}
      />

      <PurchaseCreditsDialog 
        isOpen={isPurchaseDialogOpen}
        onClose={() => setIsPurchaseDialogOpen(false)}
        onPurchase={handlePurchase}
      />

      <QRScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanQR}
      />
    </div>
  );
}
