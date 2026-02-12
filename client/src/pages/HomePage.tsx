import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Video, MapPin, Clock, Settings, User, ShoppingCart, QrCode, Check, Info, CalendarCheck, ImageIcon, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
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
  capacity: number;
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
  // URL hash dan boshlang'ich tabni o'qish
  const getTabFromHash = (): 'home' | 'gyms' | 'classes' | 'bookings' | 'scanner' => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['home', 'gyms', 'classes', 'bookings', 'scanner'];
    
    // Check if we are on a specific gym route
    if (window.location.pathname.startsWith('/gym/')) {
      return 'gyms';
    }
    
    return validTabs.includes(hash) ? (hash as any) : 'home';
  };

  const [activeTab, setActiveTabState] = useState<'home' | 'gyms' | 'classes' | 'bookings' | 'scanner'>(getTabFromHash());
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successGymName, setSuccessGymName] = useState<string>("");
  const [showVisitHistory, setShowVisitHistory] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownData, setCountdownData] = useState<{
    remainingMinutes: number;
    scheduledTime: string;
    scheduledDate: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedGymForBooking, setSelectedGymForBooking] = useState<Gym | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  const [homeGalleryGym, setHomeGalleryGym] = useState<Gym | null>(null);
  const [homeGalleryIndex, setHomeGalleryIndex] = useState(0);
  const [homeDetailGym, setHomeDetailGym] = useState<Gym | null>(null);
  const [, setLocation] = useLocation();
  const [params] = useLocation();

  const { data: tashkentTime } = useQuery<{ date: string; time: string; dayOfWeek: number }>({
    queryKey: ['/api/tashkent-time'],
    refetchInterval: 60000,
  });

  const { data: gymsData, isLoading: gymsLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  // Handle direct gym links
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/gym/')) {
      const gymId = path.split('/')[2];
      const gym = gyms.find(g => g.id === gymId);
      if (gym) {
        setSelectedGymForBooking(gym);
      }
    }
  }, [gyms.length, window.location.pathname]);

  // Tab o'zgarganda URL hash ni yangilash
  const setActiveTab = (tab: 'home' | 'gyms' | 'classes' | 'bookings' | 'scanner') => {
    setActiveTabState(tab);
    // Hash ni yangilash (browser history ga qo'shish)
    window.history.pushState(null, '', `#${tab}`);
  };

  // Orqaga tugmasini bosganda hashchange ni eshitish
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getTabFromHash();
      setActiveTabState(newTab);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

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
        }
      );
    }
  }, []);

  // Check for payment success/cancel in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const creditsParam = urlParams.get('credits');

    if (paymentStatus === 'success') {
      toast({
        title: "To'lov muvaffaqiyatli!",
        description: creditsParam ? `${creditsParam} kredit hisobingizga qo'shildi` : "Kredit hisobingizga qo'shildi",
      });
      window.history.replaceState({}, '', '/');
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

  const creditsCountValue = user?.credits ?? 0;

  const DAY_NAMES = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

  const getDayOfWeek = (dateStr: string): string => {
    const date = new Date(dateStr);
    return DAY_NAMES[date.getDay()];
  };

  // Calculate distance for each gym and sort by distance
  const gymsWithDistance = gyms.map(gym => {
    let computedDistance: string = gym.distance;
    if (userLocation && gym.latitude && gym.longitude) {
      const gymLat = parseFloat(gym.latitude.toString().trim());
      const gymLng = parseFloat(gym.longitude.toString().trim());

      if (!isNaN(gymLat) && !isNaN(gymLng)) {
        const dist = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          gymLat,
          gymLng
        );
        computedDistance = `${dist.toFixed(1)} km`;
      }
    }
    return { ...gym, distance: computedDistance, _distanceNum: userLocation && gym.latitude && gym.longitude ? parseFloat(computedDistance) : Infinity };
  }).sort((a, b) => a._distanceNum - b._distanceNum);

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
  const { data: gymTimeSlotsData } = useQuery<{ timeSlots: TimeSlot[] }>({
    queryKey: ['/api/time-slots', selectedGymForBooking?.id],
    enabled: !!selectedGymForBooking?.id,
    queryFn: () => fetch(`/api/time-slots?gymId=${selectedGymForBooking?.id}`, { credentials: 'include' }).then(res => res.json()),
  });

  const gymTimeSlots = gymTimeSlotsData?.timeSlots || [];

  const getDayOfWeekFromDateStr = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return DAY_NAMES[date.getDay()];
  };

  const slotsForSelectedDate = selectedBookingDate
    ? gymTimeSlots
        .filter(slot => {
          if (slot.dayOfWeek !== getDayOfWeekFromDateStr(selectedBookingDate)) return false;
          if (tashkentTime && selectedBookingDate === tashkentTime.date) {
            return slot.endTime > tashkentTime.time;
          }
          return true;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

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
  const activeBookings = bookings.filter(b => !b.isCompleted && b.status !== 'missed' && b.status !== 'completed');
  const completedBookings = bookings.filter(b => b.isCompleted || b.status === 'missed' || b.status === 'completed');

  const filteredGyms = gymsWithDistance.filter(gym => {
    const matchesCategory = selectedCategory === 'all' || gym.categories?.includes(selectedCategory);
    const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = maxPrice === undefined || gym.credits <= maxPrice;
    return matchesCategory && matchesSearch && matchesPrice;
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
    const gym = gyms.find(g => g.id === gymId);
    if (gym) {
      setSelectedGymForBooking(gym);
      setSelectedBookingDate('');
      setSelectedTimeSlot(null);
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
        const error = await response.json();
        throw new Error(error.message || 'Xarid amalga oshmadi');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
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

  const handleScanQR = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setIsScannerOpen(true);
    }
  };

  const handleQRScan = async (data: string) => {
    try {
      const body: any = { qrCode: data };
      if (selectedBooking) {
        body.bookingId = selectedBooking.id;
      }

      const response = await fetch('/api/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        setIsScannerOpen(false);
        setSelectedBooking(null);
        const gymName = result.gym?.name || "Zal";
        setSuccessGymName(gymName);
        setShowSuccessAnimation(true);
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      } else if (result.earlyArrival) {
        setIsScannerOpen(false);
        setSelectedBooking(null);
        setCountdownData({
          remainingMinutes: result.remainingMinutes,
          scheduledTime: result.scheduledTime,
          scheduledDate: result.scheduledDate
        });
        setShowCountdown(true);
      } else {
        toast({
          title: "Xatolik",
          description: result.message || "QR kod tekshirishda xatolik",
          variant: "destructive",
        });
        setIsScannerOpen(false);
        setSelectedBooking(null);
      }
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "QR kod tekshirishda xatolik yuz berdi",
        variant: "destructive",
      });
      setIsScannerOpen(false);
      setSelectedBooking(null);
    }
  };

  const categories = CATEGORIES.map(c => c.name);

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery<{ purchases: UserPurchase[] }>({
    queryKey: ['/api/my-purchases'],
    enabled: !!user,
  });
  const purchases = purchasesData?.purchases || [];
  const purchasedCollectionIds = new Set(purchases.map(p => p.collectionId));

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/my-purchases'] });
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
      {activeTab === 'home' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="font-display font-bold text-3xl mb-2">{t('app.name')}</h1>
              <p className="text-muted-foreground">{t('home.welcome')}</p>
            </div>
            <div className="flex gap-2">
              <LanguageSelector />
              <Button variant="ghost" size="icon" onClick={() => setLocation('/settings')}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setLocation('/profile')}>
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <CreditBalance
            credits={creditsCountValue}
            onPurchase={() => setIsPurchaseDialogOpen(true)}
            creditExpiryDate={user?.creditExpiryDate}
          />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-xl">{t('home.near_gyms')}</h2>
              <Link href="/map">
                <Button variant="ghost" size="sm" className="text-primary">
                  {t('home.view_all')}
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {userLocation ? t('home.sorted_by_distance') : t('home.nearby_gyms_desc')}
            </p>
            {gymsLoading ? (
              <p className="text-muted-foreground">{t('home.loading')}</p>
            ) : gymsWithDistance.length > 0 ? (
              <div className="flex flex-col gap-4">
                {gymsWithDistance.slice(0, 8).map((gym) => {
                  const gymImages = gym.images && gym.images.length > 0 ? gym.images : [gym.imageUrl || getGymImage(gym.categories?.[0] || '')];
                  return (
                    <Card
                      key={gym.id}
                      className="overflow-hidden w-full"
                    >
                      <div
                        className="relative h-48 cursor-pointer"
                        onClick={() => {
                          setHomeGalleryGym(gym);
                          setHomeGalleryIndex(0);
                        }}
                      >
                        <img
                          src={gym.imageUrl || getGymImage(gym.categories?.[0] || '')}
                          alt={gym.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        {gymImages.length > 1 && (
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            {gymImages.length}
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground border-primary-border font-display font-bold text-xs px-2 py-0.5">
                          {gym.credits} kalit
                        </Badge>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-semibold text-lg truncate leading-tight">
                            {gym.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-white/80 text-sm flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {gym.distance && gym.distance !== '0 km'
                                ? (language === 'uz' 
                                    ? `Sizdan ${gym.distance} uzoqlikda` 
                                    : `${gym.distance} от вас`)
                                : (language === 'uz' ? 'Masofa nomaʼlum' : 'Расстояние неизвестно')}
                            </span>
                          </div>
                          <p className="text-white/60 text-xs mt-0.5 truncate">
                            {gym.categories?.join(', ') || ''}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setHomeDetailGym(gym)}
                          data-testid={`button-home-gym-details-${gym.id}`}
                        >
                          <Info className="w-3.5 h-3.5 mr-1.5" />
                          Batafsil
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleBookGym(gym.id)}
                          data-testid={`button-home-gym-book-${gym.id}`}
                        >
                          <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                          Band qilish
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">{t('home.no_gyms_yet')}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gyms' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-bold text-2xl">{t('home.gyms_title')}</h1>
            <Link href="/map">
              <Button variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                {t('map.view_on_google')}
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
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : filteredGyms.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{t('home.no_gyms_filter')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
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
                  images={gym.images}
                  address={gym.address}
                  latitude={gym.latitude ?? undefined}
                  longitude={gym.longitude ?? undefined}
                  description={gym.description ?? undefined}
                  facilities={gym.facilities ?? undefined}
                  onBook={handleBookGym}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="p-4 space-y-6">
          <h1 className="font-display font-bold text-2xl">{t('courses.title')}</h1>
          {classesLoading || purchasesLoading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : onlineClasses.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {onlineClasses.map((collection) => {
                const isPurchased = purchasedCollectionIds.has(collection.id);
                return (
                  <Card key={collection.id} className="overflow-hidden hover-elevate">
                    <div className="relative aspect-square">
                      <img src={collection.thumbnailUrl || classImage} alt={collection.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm line-clamp-2">{collection.name}</h3>
                        <p className="text-white/80 text-xs mt-1">{collection.isFree ? t('courses.free') : `${collection.price} sum`}</p>
                      </div>
                    </div>
                    <div className="p-2">
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => isPurchased ? setLocation(`/my-courses/${collection.id}`) : handlePurchaseCollection(collection.id)}
                      >
                        {isPurchased ? <Video className="h-3 w-3 mr-1" /> : <ShoppingCart className="h-3 w-3 mr-1" />}
                        {isPurchased ? t('home.purchased') : t('courses.buy')}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">{t('courses.no_courses_desc')}</p>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display font-bold text-2xl">{t('profile.history_title')}</h1>
            <Button variant="outline" size="sm" onClick={() => setShowVisitHistory(true)}>
              <Clock className="w-4 h-4 mr-2" />
              {t('profile.history_title')}
            </Button>
          </div>
          {activeBookings.length > 0 ? (
            <div className="space-y-3">
              {activeBookings.map((booking) => {
                const gym = gyms.find(g => g.id === booking.gymId);
                return (
                  <BookingCard
                    key={booking.id}
                    id={booking.id}
                    gymName={gym?.name || t('profile.unknown_gym')}
                    gymImage={gym?.imageUrl || getGymImage(gym?.categories?.[0] || '')}
                    date={new Date(booking.date).toLocaleDateString()}
                    time={booking.time}
                    onScanQR={() => handleScanQR(booking.id)}
                    onCancel={handleCancelBooking}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('profile.no_history')}</p>
          )}
        </div>
      )}

      {activeTab === 'scanner' && (
        <div className="p-4">
          <h1 className="font-display font-bold text-2xl mb-4">{t('nav.scanner')}</h1>
          {activeBookings.length > 0 ? (
            <div className="space-y-3">
              {activeBookings.map((booking) => {
                const gym = gyms.find(g => g.id === booking.gymId);
                return (
                  <Card key={booking.id} className="cursor-pointer hover-elevate" onClick={() => handleScanQR(booking.id)}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <img src={gym?.imageUrl || getGymImage(gym?.categories?.[0] || '')} alt={gym?.name} className="w-16 h-16 rounded-md object-cover" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{gym?.name}</h3>
                        <p className="text-sm text-muted-foreground">{new Date(booking.date).toLocaleDateString()} • {booking.time}</p>
                      </div>
                      <QrCode className="w-6 h-6 text-primary" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">{t('home.no_slots')}</p>
          )}
        </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} onScanQR={() => setIsScannerOpen(true)} />
      <PurchaseCreditsDialog isOpen={isPurchaseDialogOpen} onClose={() => setIsPurchaseDialogOpen(false)} onPurchase={handlePurchase} />
      <QRScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleQRScan} />

      {selectedGymForBooking && (
        <Dialog open={!!selectedGymForBooking} onOpenChange={(open) => !open && setSelectedGymForBooking(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[80vh] overflow-y-auto p-0 sm:rounded-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>{selectedGymForBooking.name} - Band qilish</DialogTitle>
              <DialogDescription>Sana va vaqtni tanlang</DialogDescription>
            </DialogHeader>
            <div className="relative h-32">
              <img
                src={selectedGymForBooking.imageUrl || getGymImage(selectedGymForBooking.categories?.[0] || '')}
                alt={selectedGymForBooking.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h2 className="text-white text-lg font-display font-bold truncate">{selectedGymForBooking.name}</h2>
                <p className="text-white/80 text-xs">{selectedGymForBooking.categories?.join(', ')}</p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Sanani tanlang</h3>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {(() => {
                    const dates: Date[] = [];
                    const startDate = tashkentTime 
                      ? new Date(tashkentTime.date + 'T12:00:00')
                      : new Date();
                    let dayOffset = 0;
                    while (dates.length < 7) {
                      const d = new Date(startDate);
                      d.setDate(startDate.getDate() + dayOffset);
                      if (d.getDay() !== 0) {
                        dates.push(d);
                      }
                      dayOffset++;
                    }
                    return dates.map((date) => {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const dateStr = `${y}-${m}-${day}`;
                      const isSelected = selectedBookingDate === dateStr;
                      return (
                        <Button
                          key={dateStr}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="flex-shrink-0 flex flex-col h-auto py-1.5 px-3"
                          onClick={() => {
                            setSelectedBookingDate(dateStr);
                            setSelectedTimeSlot(null);
                          }}
                          data-testid={`button-date-${dateStr}`}
                        >
                          <span className="text-[10px] opacity-70">
                            {date.toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'ru-RU', { weekday: 'short' })}
                          </span>
                          <span className="text-sm font-bold">{date.getDate()}</span>
                        </Button>
                      );
                    });
                  })()}
                </div>
              </div>

              {selectedBookingDate && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Vaqtni tanlang</h3>
                  {slotsForSelectedDate.length === 0 ? (
                    <div className="text-center py-4 bg-muted/30 rounded-md">
                      <p className="text-sm text-muted-foreground">Bu kun uchun vaqt slotlari mavjud emas</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {slotsForSelectedDate.map((slot) => {
                        const isSelected = selectedTimeSlot?.id === slot.id;
                        const isFull = slot.availableSpots <= 0;
                        return (
                          <Button
                            key={slot.id}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={`text-xs px-1.5 flex flex-col h-auto py-1.5 ${isFull ? 'opacity-50' : ''}`}
                            disabled={isFull}
                            onClick={() => setSelectedTimeSlot(slot)}
                            data-testid={`button-slot-${slot.startTime}`}
                          >
                            <span className="font-medium">{slot.startTime}</span>
                            <span className={`text-[10px] ${isFull ? 'text-destructive' : 'opacity-70'}`}>
                              {isFull ? 'To\'liq' : `${slot.availableSpots} joy`}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                disabled={!selectedBookingDate || !selectedTimeSlot || (user?.credits || 0) < selectedGymForBooking.credits}
                data-testid="button-confirm-booking"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/book-gym', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        gymId: selectedGymForBooking.id,
                        date: selectedBookingDate,
                        time: selectedTimeSlot?.startTime,
                        timeSlotId: selectedTimeSlot?.id,
                        scheduledStartTime: selectedTimeSlot?.startTime,
                        scheduledEndTime: selectedTimeSlot?.endTime,
                      }),
                    });
                    if (response.ok) {
                      toast({ title: "Muvaffaqiyatli!", description: "Zal band qilindi" });
                      setSelectedGymForBooking(null);
                      setSelectedTimeSlot(null);
                      setSelectedBookingDate('');
                      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/time-slots', selectedGymForBooking.id] });
                      setActiveTab('bookings');
                    } else {
                      const err = await response.json();
                      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
                    }
                  } catch (e) {
                    toast({ title: "Xatolik", description: "Bron qilishda xatolik", variant: "destructive" });
                  }
                }}
              >
                {(user?.credits || 0) < selectedGymForBooking.credits 
                  ? "Kredit yetarli emas" 
                  : `${selectedGymForBooking.credits} kalit bilan band qilish`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!homeDetailGym} onOpenChange={(open) => !open && setHomeDetailGym(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{homeDetailGym?.name}</DialogTitle>
            <DialogDescription>{homeDetailGym?.categories?.join(', ') || ''}</DialogDescription>
          </DialogHeader>
          {homeDetailGym && (
            <div className="space-y-4">
              {homeDetailGym.imageUrl && (
                <div
                  className="relative cursor-pointer rounded-md overflow-hidden"
                  data-testid="image-home-detail-gym"
                  onClick={() => {
                    setHomeDetailGym(null);
                    setHomeGalleryGym(homeDetailGym);
                    setHomeGalleryIndex(0);
                  }}
                >
                  <img src={homeDetailGym.imageUrl} alt={homeDetailGym.name} className="w-full h-48 object-cover" />
                  {(homeDetailGym.images && homeDetailGym.images.length > 1) && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {homeDetailGym.images.length} ta rasm
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge>{homeDetailGym.credits} {t('profile.credits_count')}</Badge>
                <span className="text-sm text-muted-foreground">{homeDetailGym.hours}</span>
              </div>

              {homeDetailGym.distance && homeDetailGym.distance !== '0 km' && (
                <div className="flex items-center gap-1.5 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{homeDetailGym.distance} masofada</span>
                </div>
              )}

              {homeDetailGym.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Tavsif</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{homeDetailGym.description}</p>
                </div>
              )}

              {homeDetailGym.facilities && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Imkoniyatlar</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{homeDetailGym.facilities}</p>
                </div>
              )}

              {(homeDetailGym.latitude && homeDetailGym.longitude) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    className="h-auto p-0 text-sm underline"
                    onClick={() => window.open(`https://www.google.com/maps?q=${homeDetailGym.latitude},${homeDetailGym.longitude}`, '_blank')}
                  >
                    {t('map.view_on_google')}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  setHomeDetailGym(null);
                  handleBookGym(homeDetailGym.id);
                }}
              >
                <CalendarCheck className="w-4 h-4 mr-2" />
                Zalni band qilish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!homeGalleryGym} onOpenChange={(open) => !open && setHomeGalleryGym(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none overflow-hidden sm:rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{homeGalleryGym?.name} rasmlari</DialogTitle>
            <DialogDescription>Zal rasmlari galereyasi</DialogDescription>
          </DialogHeader>
          {homeGalleryGym && (() => {
            const galleryImages = homeGalleryGym.images && homeGalleryGym.images.length > 0
              ? homeGalleryGym.images
              : [homeGalleryGym.imageUrl || getGymImage(homeGalleryGym.categories?.[0] || '')];
            return (
              <div className="relative aspect-video flex items-center justify-center">
                <img
                  src={galleryImages[homeGalleryIndex]}
                  alt={`${homeGalleryGym.name} gallery ${homeGalleryIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                {galleryImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 text-white rounded-full"
                      onClick={() => setHomeGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                      data-testid="button-home-gallery-prev"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 text-white rounded-full"
                      onClick={() => setHomeGalleryIndex((prev) => (prev + 1) % galleryImages.length)}
                      data-testid="button-home-gallery-next"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {galleryImages.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === homeGalleryIndex ? "bg-white w-4" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
