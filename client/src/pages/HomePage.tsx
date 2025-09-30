import { useState } from "react";
import CreditBalance from "@/components/CreditBalance";
import GymCard from "@/components/GymCard";
import GymFilters from "@/components/GymFilters";
import OnlineClassCard from "@/components/OnlineClassCard";
import BookingCard from "@/components/BookingCard";
import BottomNav from "@/components/BottomNav";
import PurchaseCreditsDialog from "@/components/PurchaseCreditsDialog";
import QRScanner from "@/components/QRScanner";
import { useToast } from "@/hooks/use-toast";

import gymImage from "@assets/generated_images/Standard_gym_facility_interior_f255ae25.png";
import poolImage from "@assets/generated_images/Swimming_pool_facility_9aea752a.png";
import yogaImage from "@assets/generated_images/Yoga_studio_space_83aaaeab.png";
import classImage from "@assets/generated_images/Online_fitness_class_instructor_ef28ee4a.png";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('home');
  const [credits, setCredits] = useState(12);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // todo: remove mock functionality - Mock gym data
  const mockGyms = [
    { id: '1', name: 'PowerFit Gym', category: 'Gym', credits: 4, distance: '1.2 km', hours: '06:00 - 23:00', imageUrl: gymImage, address: 'Amir Temur ko\'chasi' },
    { id: '2', name: 'AquaFit Basseyn', category: 'Suzish', credits: 12, distance: '2.5 km', hours: '07:00 - 22:00', imageUrl: poolImage, address: 'Mustaqillik ko\'chasi' },
    { id: '3', name: 'Zen Yoga Studio', category: 'Yoga', credits: 8, distance: '0.8 km', hours: '08:00 - 21:00', imageUrl: yogaImage, address: 'Navoi ko\'chasi' },
    { id: '4', name: 'Elite Fitness', category: 'Gym', credits: 6, distance: '3.1 km', hours: '24/7', imageUrl: gymImage, address: 'Shota Rustaveli ko\'chasi' },
  ];

  // todo: remove mock functionality - Mock online classes
  const mockClasses = [
    { id: '1', title: 'HIIT Mashq', category: 'Cardio', duration: '30 min', instructor: 'Aziza Karimova', thumbnailUrl: classImage, videoUrl: '' },
    { id: '2', title: 'Yoga Asoslari', category: 'Yoga', duration: '45 min', instructor: 'Nodira Yusupova', thumbnailUrl: classImage, videoUrl: '' },
    { id: '3', title: 'Kuch Mashqlari', category: 'Strength', duration: '40 min', instructor: 'Alisher Sadikov', thumbnailUrl: classImage, videoUrl: '' },
    { id: '4', title: 'Pilates', category: 'Flexibility', duration: '35 min', instructor: 'Dilnoza Rahimova', thumbnailUrl: classImage, videoUrl: '' },
  ];

  // todo: remove mock functionality - Mock bookings
  const [bookings, setBookings] = useState([
    { id: '1', gymName: 'PowerFit Gym', gymImage: gymImage, date: '10 Okt', time: '18:00', qrCode: 'qr123' },
    { id: '2', gymName: 'Zen Yoga Studio', gymImage: yogaImage, date: '12 Okt', time: '10:00', qrCode: 'qr456' },
  ]);

  const filteredGyms = mockGyms.filter(gym => {
    const matchesCategory = selectedCategory === 'all' || gym.category === selectedCategory;
    const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBookGym = (gymId: string) => {
    const gym = mockGyms.find(g => g.id === gymId);
    if (gym && credits >= gym.credits) {
      setCredits(credits - gym.credits);
      
      // Add new booking
      const newBooking = {
        id: `booking_${Date.now()}`,
        gymName: gym.name,
        gymImage: gym.imageUrl,
        date: new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
        time: '18:00',
        qrCode: `qr_${Date.now()}`
      };
      setBookings([...bookings, newBooking]);
      
      toast({
        title: "Muvaffaqiyatli bron qilindi!",
        description: `${gym.name} uchun ${gym.credits} kredit ishlatildi.`,
      });
    } else {
      toast({
        title: "Kredit yetarli emas",
        description: "Iltimos, kredit sotib oling.",
        variant: "destructive",
      });
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      // Remove booking from list
      setBookings(bookings.filter(b => b.id !== bookingId));
      
      // Find the gym to refund credits
      const gym = mockGyms.find(g => g.name === booking.gymName);
      if (gym) {
        setCredits(credits + gym.credits);
      }
      
      toast({
        title: "Bron bekor qilindi",
        description: "Kreditingiz qaytarildi.",
      });
    }
  };

  const handlePurchase = (creditAmount: number, price: number) => {
    setCredits(credits + creditAmount);
    toast({
      title: "Muvaffaqiyatli!",
      description: `${creditAmount} kredit sotib olindi.`,
    });
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
          <div>
            <h1 className="font-display font-bold text-3xl mb-2">FitBoom</h1>
            <p className="text-muted-foreground">Sport hayotingizni boshqaring</p>
          </div>
          
          <CreditBalance 
            credits={credits}
            onPurchase={() => setIsPurchaseDialogOpen(true)}
          />

          <div>
            <h2 className="font-display font-semibold text-xl mb-4">Yaqin atrofdagi zallar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockGyms.slice(0, 3).map((gym) => (
                <GymCard 
                  key={gym.id}
                  {...gym}
                  onBook={handleBookGym}
                />
              ))}
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGyms.map((gym) => (
              <GymCard 
                key={gym.id}
                {...gym}
                onBook={handleBookGym}
              />
            ))}
          </div>

          {filteredGyms.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Hech qanday zal topilmadi</p>
            </div>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">Online Darslar</h1>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockClasses.map((classItem) => (
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
