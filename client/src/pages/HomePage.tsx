import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Video, MapPin, Clock, Shield } from "lucide-react";
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
import type { Gym, Booking } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

import gymImage from "@assets/generated_images/Standard_gym_facility_interior_f255ae25.png";
import poolImage from "@assets/generated_images/Swimming_pool_facility_9aea752a.png";
import yogaImage from "@assets/generated_images/Yoga_studio_space_83aaaeab.png";
import classImage from "@assets/generated_images/Online_fitness_class_instructor_ef28ee4a.png";

// Define TimeSlot type if not already defined in schema
interface TimeSlot {
  id: string;
  gymId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  availableSpots: number;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('home');
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null); // Added state for selected booking
  const { toast } = useToast();
  const { user, setUserAsAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGymForBooking, setSelectedGymForBooking] = useState<Gym | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [, setLocation] = useLocation();

  // Check for payment success/cancel in URL
  useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const credits = urlParams.get('credits');

    if (paymentStatus === 'success') {
      toast({
        title: "To'lov muvaffaqiyatli!",
        description: credits ? `${credits} kredit hisobingizga qo'shildi` : "Kredit hisobingizga qo'shildi",
      });
      // Clear URL parameters
      window.history.replaceState({}, '', '/');
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "To'lov bekor qilindi",
        description: "Qaytadan urinib ko'ring",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/');
    }
  });

  const credits = user?.credits ?? 0;

  // Fetch gyms from API
  const { data: gymsData, isLoading: gymsLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  // Fetch time slots from API
  const { data: timeSlotsData } = useQuery<{ timeSlots: TimeSlot[] }>({
    queryKey: ['/api/time-slots', selectedGymForBooking?.id],
    enabled: !!selectedGymForBooking?.id,
    queryFn: () => fetch(`/api/time-slots?gymId=${selectedGymForBooking?.id}`, { credentials: 'include' }).then(res => res.json()),
  });

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

  // Fetch bookings from API
  const { data: bookingsData } = useQuery<{ bookings: Booking[] }>({
    queryKey: ['/api/bookings'],
    enabled: !!user,
  });

  const bookings = bookingsData?.bookings || [];

  const filteredGyms = gyms.filter(gym => {
    const matchesCategory = selectedCategory === 'all' || gym.category === selectedCategory;
    const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const bookGymMutation = useMutation({
    mutationFn: async (variables: { gymId: string; timeSlotId?: string }) => {
      const response = await fetch('/api/book-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(variables),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/bookings'] });

      toast({
        title: "Muvaffaqiyatli bron qilindi!",
        description: `${data.creditsUsed} kredit ishlatildi.`,
      });
      setSelectedGymForBooking(null);
      setSelectedTimeSlot(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Bron bekor qilinmadi');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });

      toast({
        title: "Bron bekor qilindi",
        description: "Kreditingiz qaytarildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xatolik",
        description: "Bron bekor qilishda xatolik yuz berdi.",
        variant: "destructive",
      });
    },
  });

  const handleCancelBooking = (bookingId: string) => {
    cancelBookingMutation.mutate(bookingId);
  };

  const handleBookGym = (gymId: string) => {
    const gym = gyms?.find(g => g.id === gymId);
    if (gym) {
      setSelectedGymForBooking(gym);
    }
  };

  const handleConfirmBooking = () => {
    if (!selectedGymForBooking) return;

    bookGymMutation.mutate({
      gymId: selectedGymForBooking.id,
      timeSlotId: selectedTimeSlot?.id,
    });
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
        const error = await response.json();
        throw new Error(error.message || 'Xarid amalga oshmadi');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Muvaffaqiyatli!",
        description: `${data.credits} kredit sotib olindi. Jami: ${data.totalCredits} kredit`,
      });
      setIsPurchaseDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message || "Kredit sotib olishda xatolik yuz berdi.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (creditAmount: number, price: number) => {
    purchaseMutation.mutate({ credits: creditAmount, price });
  };

  // Updated QR scan handlers
  const handleScanQR = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setIsScannerOpen(true);
    }
  };

  const handleQRScan = async (data: string) => {
    if (!selectedBooking) {
      toast({
        title: "Xatolik",
        description: "Bron topilmadi",
        variant: "destructive",
      });
      setIsScannerOpen(false);
      return;
    }

    try {
      const response = await fetch('/api/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          qrCode: data,
          gymId: selectedBooking.gymId 
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Muvaffaqiyatli!",
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      } else {
        toast({
          title: "Xatolik",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "QR kod tekshirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }

    setIsScannerOpen(false);
    setSelectedBooking(null);
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
            {/* Test Admin tugmasi */}
            <Button 
              className="w-full" 
              onClick={() => {
                setUserAsAdmin();
                setLocation('/admin-dashboard');
              }}
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel (Test)
            </Button>
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
              <p className="text-muted-foreground">Hozircha yaqin atrofda sport zallar mavjud emas.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-xl">Video Kurslar</h2>
              <Link href="/courses">
                <Button variant="ghost" size="sm" data-testid="button-all-courses">
                  Barchasini ko'rish →
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Professional trenerjlardan video darsliklar to'plami
            </p>
            <Link href="/courses">
              <Button className="w-full" data-testid="button-explore-courses">
                <Video className="h-4 w-4 mr-2" />
                Kurslarni Ko'rish
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Gyms Tab */}
      {activeTab === 'gyms' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-bold text-2xl">Sport Zallari</h1>
            <Link href="/map">
              <Button variant="outline" size="sm" data-testid="button-view-map">
                <MapPin className="h-4 w-4 mr-2" />
                Haritada Ko'rish
              </Button>
            </Link>
          </div>

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
                  <p className="text-muted-foreground">Sizning qidiruv shartingizga mos sport zal topilmadi</p>
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
              <p className="text-muted-foreground">Hozircha online darslar mavjud emas. Tez orada yangi darslar qo'shiladi!</p>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">Mening Bronlarim</h1>

          <div className="space-y-3">
            {bookings.map((booking) => {
              const gym = gyms.find(g => g.id === booking.gymId);
              return (
                <BookingCard 
                  key={booking.id}
                  id={booking.id}
                  gymName={gym?.name || 'Sport Zali'}
                  gymImage={gym?.imageUrl || getGymImage(gym?.category || '')}
                  date={booking.date}
                  time={booking.time}
                  onScanQR={() => handleScanQR(booking.id)} // Pass booking ID to handleScanQR
                  onCancel={handleCancelBooking}
                />
              );
            })}
          </div>

          {bookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Bronlar yo'q</p>
            </div>
          )}
        </div>
      )}

      {/* Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="h-screen bg-background">
          <div className="p-4 pb-24">
            <h1 className="font-display font-bold text-2xl mb-4">QR Kod Skaner</h1>
            <p className="text-muted-foreground mb-6">
              Zalga kirish uchun QR kodni skanerlang
            </p>
            <div className="rounded-lg overflow-hidden">
              <QRScanner 
                isOpen={true}
                onClose={() => setActiveTab('home')}
                onScan={handleQRScan}
                isDialog={false}
              />
            </div>
          </div>
        </div>
      )}

      <BottomNav 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onScanQR={() => {
          // When starting scan from BottomNav, we don't have a specific booking yet.
          // The user will select a booking first from the 'bookings' tab.
          // For now, just open the scanner, but it will prompt for booking selection.
          // A better UX would be to navigate to 'bookings' tab first if no booking is selected.
          setIsScannerOpen(true); 
        }}
      />

      <PurchaseCreditsDialog 
        isOpen={isPurchaseDialogOpen}
        onClose={() => setIsPurchaseDialogOpen(false)}
        onPurchase={handlePurchase}
      />

      <QRScanner 
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setSelectedBooking(null);
        }}
        onScan={handleQRScan}
        gymId={selectedBooking?.gymId} // Pass gymId to QRScanner
      />

      {/* Time Slot Selection Dialog */}
      <Dialog open={!!selectedGymForBooking} onOpenChange={(open) => !open && setSelectedGymForBooking(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-select-time-slot">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Vaqtni tanlang</DialogTitle>
            <DialogDescription>
              {selectedGymForBooking?.name} uchun vaqt slotini tanlang
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {timeSlotsData?.timeSlots && timeSlotsData.timeSlots.length > 0 ? (
              <div className="space-y-2">
                {timeSlotsData.timeSlots
                  .filter(slot => slot.availableSpots > 0)
                  .map((slot) => (
                    <Card
                      key={slot.id}
                      className={`cursor-pointer transition-all ${
                        selectedTimeSlot?.id === slot.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedTimeSlot(slot)}
                      data-testid={`card-time-slot-${slot.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {slot.dayOfWeek} • {slot.startTime} - {slot.endTime}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {slot.availableSpots} joy mavjud
                              </p>
                            </div>
                          </div>
                          {selectedTimeSlot?.id === slot.id && (
                            <Badge>Tanlandi</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Bu zal uchun vaqt slotlari yo'q. Vaqtsiz bron qilishingiz mumkin.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleConfirmBooking}
                disabled={bookGymMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-booking"
              >
                {bookGymMutation.isPending ? 'Yuklanmoqda...' : 'Tasdiqlash'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGymForBooking(null);
                  setSelectedTimeSlot(null);
                }}
                className="flex-1"
                data-testid="button-cancel-booking"
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