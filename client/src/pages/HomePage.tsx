import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Video, MapPin, Clock, Settings, User, ShoppingCart, KeyRound, QrCode } from "lucide-react";
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
import type { Gym, Booking, UserPurchase } from "@shared/schema";
import { CATEGORIES, type Category } from "@shared/categories";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import gymImage from "@assets/814914041712414214qaranliqenerji_1765638608962.jpg";
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

// Function to calculate distance between two lat/lng points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'home' | 'gyms' | 'classes' | 'bookings' | 'scanner'>('home');
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGymForBooking, setSelectedGymForBooking] = useState<Gym | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [, setLocation] = useLocation();

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Optionally show a toast or default to a general location
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  // Check for payment success/cancel in URL
  useEffect(() => {
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
  }, [toast, queryClient]);

  const credits = user?.credits ?? 0;

  // Fetch gyms from API
  const { data: gymsData, isLoading: gymsLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  // Calculate distance for each gym and sort by distance
  const gymsWithDistance = gyms.map(gym => {
    let distance = undefined;
    if (userLocation && gym.latitude && gym.longitude) {
      const gymLat = parseFloat(gym.latitude.toString().trim());
      const gymLng = parseFloat(gym.longitude.toString().trim());

      if (!isNaN(gymLat) && !isNaN(gymLng)) {
        distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          gymLat,
          gymLng
        );
      }
    }
    return { ...gym, distance };
  }).sort((a, b) => {
    if (a.distance === undefined && b.distance === undefined) return 0;
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  });

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

  // Fetch video collections from API
  const { data: collectionsData, isLoading: classesLoading } = useQuery<{ collections: any[] }>({
    queryKey: ['/api/collections'],
  });

  const onlineClasses = collectionsData?.collections || [];

  // Fetch bookings from API
  const { data: bookingsData } = useQuery<{ bookings: Booking[] }>({
    queryKey: ['/api/bookings'],
    enabled: !!user,
  });

  const bookings = bookingsData?.bookings || [];
  
  // Filter active bookings (not completed)
  const activeBookings = bookings.filter(b => !b.isCompleted);

  const filteredGyms = gymsWithDistance.filter(gym => {
    const matchesCategory = selectedCategory === 'all' || gym.categories?.includes(selectedCategory);
    const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = maxPrice === undefined || gym.credits <= maxPrice;
    return matchesCategory && matchesSearch && matchesPrice;
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
        description: `${data.creditsUsed} kalit ishlatildi.`,
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
        description: "Kalitingiz qaytarildi.",
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

    const bookingData: any = {
      gymId: selectedGymForBooking.id,
    };

    // Agar vaqt sloti tanlangan bo'lsa, uning ma'lumotlarini qo'shamiz
    if (selectedTimeSlot) {
      // Bugungi sanani YYYY-MM-DD formatida olamiz
      const today = new Date().toISOString().split('T')[0];
      bookingData.date = today;
      bookingData.time = selectedTimeSlot.startTime;
    }

    bookGymMutation.mutate(bookingData);
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
        description: `${data.credits} kalit sotib olindi. Jami: ${data.totalCredits} kalit`,
      });
      setIsPurchaseDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message || "Kalit sotib olishda xatolik yuz berdi.",
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

  const categories = CATEGORIES.map(c => c.name);

  // Fetch purchased collections
  const { data: purchasesData, isLoading: purchasesLoading } = useQuery<{ purchases: UserPurchase[] }>({
    queryKey: ['/api/my-purchases'],
    enabled: !!user,
  });
  const purchases = purchasesData?.purchases || [];
  const purchasedCollectionIds = new Set(purchases.map(p => p.collectionId));

  // Mutation to purchase a collection
  const purchaseCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const response = await fetch('/api/purchase-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collectionId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'To\'plamni sotib olishda xatolik yuz berdi');
      }
      return response.json();
    },
    onSuccess: async (data, collectionId) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/my-purchases'] });
      await queryClient.refetchQueries({ queryKey: ['/api/my-purchases'] });
      toast({
        title: "Muvaffaqiyatli!",
        description: `To'plam muvaffaqiyatli sotib olindi.`,
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

  const handlePurchaseCollection = (collectionId: string) => {
    purchaseCollectionMutation.mutate(collectionId);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Home Tab */}
      {activeTab === 'home' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="font-display font-bold text-3xl mb-2">FitBoom</h1>
              <p className="text-muted-foreground">Sport hayotingizni boshqaring</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/settings')}
                data-testid="button-settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/profile')}
                data-testid="button-profile"
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <CreditBalance
            credits={credits}
            onPurchase={() => setIsPurchaseDialogOpen(true)}
            creditExpiryDate={user?.creditExpiryDate}
          />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-xl">Sizga eng yaqin zallar</h2>
              <Link href="/gyms">
                <Button variant="ghost" size="sm" className="text-primary">
                  Barchasini ko'rish
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {userLocation ? "Masofaga qarab saralangan" : "Yaqin atrofdagi sport zallari"}
            </p>
            {gymsLoading ? (
              <p className="text-muted-foreground">Yuklanmoqda...</p>
            ) : gymsWithDistance.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                {gymsWithDistance.slice(0, 8).map((gym) => (
                  <Card
                    key={gym.id}
                    className="overflow-hidden cursor-pointer hover-elevate aspect-square min-w-[110px] w-[110px] flex-shrink-0 snap-start"
                    onClick={() => handleBookGym(gym.id)}
                    data-testid={`card-gym-square-${gym.id}`}
                  >
                    <div className="relative h-full">
                      <img
                        src={gym.imageUrl || getGymImage(gym.categories?.[0] || '')}
                        alt={gym.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <h3 className="text-white font-semibold text-xs truncate leading-tight">
                          {gym.name}
                        </h3>
                        <p className="text-white/70 text-[10px] truncate">
                          {gym.categories?.join(', ') || ''}
                        </p>
                        {gym.distance !== undefined ? (
                          <p className="text-white/70 text-[10px]">
                            {gym.distance.toFixed(1)} km
                          </p>
                        ) : (
                          <p className="text-white/70 text-[10px]">
                            Masofa noma'lum
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                Hozircha zallar mavjud emas
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-xl">Video Kurslar</h2>
            </div>
            {classesLoading || purchasesLoading ? (
              <p className="text-muted-foreground">Yuklanmoqda...</p>
            ) : onlineClasses.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                {onlineClasses.slice(0, 8).map((collection) => {
                  const isPurchased = purchasedCollectionIds.has(collection.id);
                  return (
                    <Card
                      key={collection.id}
                      className="overflow-hidden cursor-pointer hover-elevate aspect-square min-w-[110px] w-[110px] flex-shrink-0 snap-start"
                      onClick={() => isPurchased ? setLocation(`/my-courses/${collection.id}`) : handlePurchaseCollection(collection.id)}
                      data-testid={`card-collection-square-${collection.id}`}
                    >
                      <div className="relative h-full">
                        <img
                          src={collection.thumbnailUrl || classImage}
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <h3 className="text-white font-semibold text-xs truncate leading-tight">
                            {collection.name}
                          </h3>
                          <p className="text-white/70 text-[10px] truncate">
                            {isPurchased ? 'Sotib olingan' : `${collection.price} so'm`}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Hozircha video kurslar mavjud emas. Tez orada yangi kurslar qo'shiladi!</p>
              </div>
            )}
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
            maxPrice={maxPrice}
            onMaxPriceChange={setMaxPrice}
          />

          {gymsLoading ? (
            <p className="text-muted-foreground">Yuklanmoqda...</p>
          ) : filteredGyms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Sizning qidiruv shartingizga mos sport zal topilmadi</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
              {filteredGyms.map((gym) => (
                <GymCard
                  key={gym.id}
                  id={gym.id}
                  name={gym.name}
                  category={gym.categories?.[0] || ''}
                  credits={gym.credits}
                  distance={gym.distance}
                  hours={gym.hours}
                  imageUrl={gym.imageUrl || getGymImage(gym.categories?.[0] || '')}
                  address={gym.address}
                  latitude={gym.latitude || undefined}
                  longitude={gym.longitude || undefined}
                  onBook={handleBookGym}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">Video Kurslar</h1>

          {classesLoading || purchasesLoading ? (
            <p className="text-muted-foreground">Yuklanmoqda...</p>
          ) : onlineClasses.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {onlineClasses.map((collection) => {
                const isPurchased = purchasedCollectionIds.has(collection.id);
                return (
                  <Card
                    key={collection.id}
                    className="overflow-hidden hover-elevate"
                    data-testid={`card-collection-grid-${collection.id}`}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={collection.thumbnailUrl || classImage}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm line-clamp-2">
                          {collection.name}
                        </h3>
                        <p className="text-white/80 text-xs mt-1">
                          {collection.isFree ? 'Bepul' : `${collection.price} sum`}
                        </p>
                      </div>
                    </div>
                    <div className="p-2">
                      {isPurchased ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setLocation(`/my-courses/${collection.id}`)}
                        >
                          <Video className="h-3 w-3 mr-1" />
                          Sotib olingan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handlePurchaseCollection(collection.id)}
                          disabled={purchaseCollectionMutation.isPending}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          {purchaseCollectionMutation.isPending ? 'Yuklanmoqda...' : 'Sotib olish'}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Hozircha video kurslar mavjud emas. Tez orada yangi kurslar qo'shiladi!</p>
              <Link href="/courses">
                <Button className="mt-4" data-testid="button-explore-courses">
                  <Video className="h-4 w-4 mr-2" />
                  Kurslarni Ko'rish
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">Mening Bronlarim</h1>

          {activeBookings.length > 0 ? (
            <div className="space-y-3">
              {activeBookings.map((booking) => {
                const gym = gyms.find(g => g.id === booking.gymId);
                return (
                  <BookingCard
                    key={booking.id}
                    id={booking.id}
                    gymName={gym?.name || "Unknown"}
                    gymImage={gym?.imageUrl || getGymImage(gym?.categories?.[0] || '')}
                    gymAddress={gym?.address || ""}
                    date={new Date(booking.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                    time={booking.time}
                    latitude={gym?.latitude || undefined}
                    longitude={gym?.longitude || undefined}
                    onScanQR={() => handleScanQR(booking.id)}
                    onCancel={handleCancelBooking}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Hozircha faol bronlar yo'q</p>
          )}
        </div>
      )}

      {/* Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="p-4 pb-24">
          <h1 className="font-display font-bold text-2xl mb-4">QR Kod Skaner</h1>
          
          {activeBookings.length > 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Qaysi bron uchun QR kodni skanerlash kerak? Bronni tanlang:
              </p>
              <div className="space-y-3">
                {activeBookings.map((booking) => {
                  const gym = gyms.find(g => g.id === booking.gymId);
                  return (
                    <Card 
                      key={booking.id} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleScanQR(booking.id)}
                      data-testid={`card-scanner-booking-${booking.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={gym?.imageUrl || getGymImage(gym?.categories?.[0] || '')}
                            alt={gym?.name}
                            className="w-16 h-16 rounded-md object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{gym?.name || "Noma'lum"}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })} • {booking.time}
                            </p>
                          </div>
                          <QrCode className="w-6 h-6 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Hozircha faol bronlar yo'q. Avval zalga bron qiling.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setActiveTab('gyms')}
                data-testid="button-go-to-gyms"
              >
                Zallarni ko'rish
              </Button>
            </div>
          )}
        </div>
      )}

      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'home' | 'gyms' | 'classes' | 'bookings' | 'scanner')}
        onScanQR={() => {
          setIsScannerOpen(true);
        }}
      />

      <PurchaseCreditsDialog
        isOpen={isPurchaseDialogOpen}
        onClose={() => setIsPurchaseDialogOpen(false)}
        onPurchase={handlePurchase}
        creditExpiryDate={user?.creditExpiryDate}
        currentCredits={credits}
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
            {selectedGymForBooking && (selectedGymForBooking.latitude && selectedGymForBooking.longitude || selectedGymForBooking.address) && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Manzil</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedGymForBooking.latitude && selectedGymForBooking.longitude) {
                      window.open(`https://www.google.com/maps?q=${selectedGymForBooking.latitude},${selectedGymForBooking.longitude}`, '_blank');
                    } else if (selectedGymForBooking.address) {
                      window.open(selectedGymForBooking.address, '_blank');
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Haritada ko'rish
                </Button>
              </div>
            )}
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