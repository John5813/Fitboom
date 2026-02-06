import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Video, MapPin, Clock, Settings, User, ShoppingCart, KeyRound, QrCode, Check } from "lucide-react";
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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedGymForBooking, setSelectedGymForBooking] = useState<Gym | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  const [, setLocation] = useLocation();

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

  // Function to get next occurrence of a specific day of week
  const getNextDayOccurrence = (dayOfWeek: string): string => {
    const dayMap: Record<string, number> = {
      'Yakshanba': 0, 'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3,
      'Payshanba': 4, 'Juma': 5, 'Shanba': 6
    };
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return new Date().toISOString().split('T')[0];
    
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;
    if (daysUntilTarget < 0) daysUntilTarget += 7;
    if (daysUntilTarget === 0) daysUntilTarget = 0; // Allow today
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate.toISOString().split('T')[0];
  };

  // Get available dates for selected time slot (next 4 occurrences of that weekday)
  const getAvailableDates = (dayOfWeek: string): { date: string; label: string }[] => {
    const dayMap: Record<string, number> = {
      'Yakshanba': 0, 'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3,
      'Payshanba': 4, 'Juma': 5, 'Shanba': 6
    };
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return [];
    
    const dates: { date: string; label: string }[] = [];
    const today = new Date();
    const currentDay = today.getDay();
    
    for (let week = 0; week < 4; week++) {
      let daysUntilTarget = targetDay - currentDay + (week * 7);
      if (week === 0 && daysUntilTarget < 0) daysUntilTarget += 7;
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);
      
      const dateStr = targetDate.toISOString().split('T')[0];
      const label = week === 0 && daysUntilTarget === 0 ? 'Bugun' : 
                   week === 0 && daysUntilTarget === 1 ? 'Ertaga' :
                   targetDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
      
      dates.push({ date: dateStr, label });
    }
    
    return dates;
  };

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
  
  // Filter active bookings (not completed and not missed)
  const activeBookings = bookings.filter(b => !b.isCompleted && b.status !== 'missed');
  
  // Filter completed bookings (visit history) - include both completed and missed
  const completedBookings = bookings.filter(b => b.isCompleted || b.status === 'missed');

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
      if (!selectedBookingDate) {
        toast({
          title: "Sana tanlanmagan",
          description: "Iltimos, bron sanasini tanlang.",
          variant: "destructive"
        });
        return;
      }
      bookingData.date = selectedBookingDate;
      bookingData.time = selectedTimeSlot.startTime;
      bookingData.timeSlotId = selectedTimeSlot.id;
      bookingData.scheduledStartTime = selectedTimeSlot.startTime;
      bookingData.scheduledEndTime = selectedTimeSlot.endTime;
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
          bookingId: selectedBooking.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsScannerOpen(false);
        
        // Get gym name from result or bookings
        const gymName = result.gym?.name || gyms.find(g => g.id === selectedBooking.gymId)?.name || "Zal";
        setSuccessGymName(gymName);
        setShowSuccessAnimation(true);
        
        // Animation stays until user clicks the confirm button
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      } else if (result.earlyArrival) {
        // Erta kelish - countdown ko'rsatish
        setIsScannerOpen(false);
        setCountdownData({
          remainingMinutes: result.remainingMinutes,
          scheduledTime: result.scheduledTime,
          scheduledDate: result.scheduledDate
        });
        setShowCountdown(true);
      } else if (result.missed) {
        // Vaqtdan o'tib ketdi
        setIsScannerOpen(false);
        setSelectedBooking(null);
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
        toast({
          title: "Vaqt o'tib ketdi",
          description: result.message,
          variant: "destructive",
        });
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
              <h1 className="font-display font-bold text-3xl mb-2">{t('app.name')}</h1>
              <p className="text-muted-foreground">{t('home.welcome')}</p>
            </div>
            <div className="flex gap-2">
              <LanguageSelector />
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
              <h2 className="font-display font-semibold text-xl">{t('home.near_gyms')}</h2>
              <Link href="/gyms">
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
                            {t('home.unknown_distance')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                {t('home.no_gyms_yet')}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-xl">{t('courses.title')}</h2>
            </div>
            {classesLoading || purchasesLoading ? (
              <p className="text-muted-foreground">{t('common.loading')}</p>
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
                            {isPurchased ? t('home.purchased') : `${collection.price} so'm`}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">{t('home.videos_soon')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gyms Tab */}
      {activeTab === 'gyms' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-bold text-2xl">{t('home.gyms_title')}</h1>
            <Link href="/map">
              <Button variant="outline" size="sm" data-testid="button-view-map">
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
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('home.no_gyms_filter')}</p>
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
          <h1 className="font-display font-bold text-2xl">{t('courses.title')}</h1>

          {classesLoading || purchasesLoading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
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
                          {collection.isFree ? t('courses.free') : `${collection.price} sum`}
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
                          {t('home.purchased')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handlePurchaseCollection(collection.id)}
                          disabled={purchaseCollectionMutation.isPending}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          {purchaseCollectionMutation.isPending ? t('common.loading') : t('courses.buy')}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('courses.no_courses_desc')}</p>
              <Link href="/courses">
                <Button className="mt-4" data-testid="button-explore-courses">
                  <Video className="h-4 w-4 mr-2" />
                  {t('courses.view')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display font-bold text-2xl">{t('profile.history_title')}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVisitHistory(true)}
              className="flex items-center gap-2"
              data-testid="button-visit-history"
            >
              <Clock className="w-4 h-4" />
              {t('profile.history_title')}
              {completedBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">{completedBookings.length}</Badge>
              )}
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
                    gymAddress={gym?.address || ""}
                    date={new Date(booking.date).toLocaleDateString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })}
                    time={booking.time}
                    latitude={gym?.latitude || undefined}
                    longitude={gym?.longitude || undefined}
                    onScanQR={() => handleScanQR(booking.id)}
                    onCancel={handleCancelBooking}
                    status={booking.status || undefined}
                    scheduledStartTime={booking.scheduledStartTime || undefined}
                    scheduledEndTime={booking.scheduledEndTime || undefined}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('profile.no_history')}</p>
          )}
        </div>
      )}

      {/* Visit History Dialog */}
      <Dialog open={showVisitHistory} onOpenChange={setShowVisitHistory}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid="dialog-visit-history">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Zallar tarixi
            </DialogTitle>
            <DialogDescription>
              Siz tashrif buyurgan zallar ro'yxati
            </DialogDescription>
          </DialogHeader>

          {completedBookings.length > 0 ? (
            <div className="space-y-3 mt-4">
              {completedBookings.map((booking) => {
                const gym = gyms.find(g => g.id === booking.gymId);
                const bookingDate = new Date(booking.date);
                const isMissed = booking.status === 'missed';
                return (
                  <div
                    key={booking.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isMissed 
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' 
                        : 'bg-muted/50'
                    }`}
                    data-testid={`visit-history-item-${booking.id}`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={gym?.imageUrl || getGymImage(gym?.categories?.[0] || '')}
                        alt={gym?.name}
                        className={`w-full h-full object-cover ${isMissed ? 'opacity-60 grayscale' : ''}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold truncate ${
                          isMissed ? 'text-red-600 dark:text-red-400' : ''
                        }`}>
                          {gym?.name || "Noma'lum zal"}
                        </h4>
                        {isMissed && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            O'tib ketgan
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-medium ${
                        isMissed ? 'text-red-600 dark:text-red-400' : ''
                      }`}>
                        {bookingDate.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className={`text-xs ${
                        isMissed ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'
                      }`}>
                        {booking.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Hali tashrif buyurilgan zallar yo'q</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="p-4 pb-24">
          <h1 className="font-display font-bold text-2xl mb-4">{t('nav.scanner')}</h1>
          
          {activeBookings.length > 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t('home.scanner_desc')}
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
                            <h3 className="font-semibold">{gym?.name || t('profile.unknown_gym')}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.date).toLocaleDateString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })} • {booking.time}
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
                {t('home.no_slots')}
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setActiveTab('gyms')}
                data-testid="button-go-to-gyms"
              >
                {t('home.view_all')}
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

      {/* Countdown Timer Overlay */}
      {showCountdown && countdownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-r from-amber-400 to-orange-400 opacity-20"
                style={{
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Pulsing rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-72 h-72 rounded-full border border-amber-500/20 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-56 h-56 rounded-full border border-orange-500/30 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          </div>

          <div className="relative text-center space-y-6 p-8 max-w-md mx-auto">
            {/* Timer icon */}
            <div className="relative mx-auto" style={{ width: '140px', height: '140px' }}>
              <div 
                className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 opacity-30 blur-xl"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              />
              <div 
                className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl"
              >
                <Clock className="w-16 h-16 text-white" />
              </div>
            </div>

            {/* Countdown display */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Vaqtingiz hali kelmadi</h2>
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                {Math.floor(countdownData.remainingMinutes / 60) > 0 && (
                  <span>{Math.floor(countdownData.remainingMinutes / 60)} soat </span>
                )}
                <span>{countdownData.remainingMinutes % 60} min</span>
              </div>
              <p className="text-gray-400">
                Belgilangan vaqt: {countdownData.scheduledTime}
              </p>
              <p className="text-gray-500 text-sm">
                {new Date(countdownData.scheduledDate).toLocaleDateString('uz-UZ', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>

            {/* Info text */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-200 text-sm">
                Vaqtingizdan 15 minut oldin va 1 soat ichida kirish mumkin.
              </p>
            </div>

            {/* Close button */}
            <Button
              onClick={() => {
                setShowCountdown(false);
                setCountdownData(null);
                setSelectedBooking(null);
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3"
              data-testid="button-close-countdown"
            >
              Tushundim
            </Button>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-20"
                style={{
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Glowing rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-80 h-80 rounded-full border border-emerald-500/20 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-64 h-64 rounded-full border border-cyan-500/30 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <div className="absolute w-48 h-48 rounded-full border border-emerald-400/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
          </div>

          <div className="relative text-center space-y-8 p-8 max-w-md mx-auto">
            {/* Main success icon with glow */}
            <div className="relative mx-auto" style={{ width: '160px', height: '160px' }}>
              {/* Outer glow ring */}
              <div 
                className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 opacity-30 blur-xl"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              />
              
              {/* Rotating gradient border */}
              <div 
                className="absolute inset-2 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500"
                style={{ 
                  animation: 'spin 3s linear infinite',
                  padding: '3px'
                }}
              >
                <div className="w-full h-full rounded-full bg-gray-900" />
              </div>

              {/* Key icon container */}
              <div 
                className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl"
                style={{ 
                  animation: 'bounceIn 0.6s ease-out',
                  boxShadow: '0 0 60px rgba(16, 185, 129, 0.5), 0 0 100px rgba(6, 182, 212, 0.3)'
                }}
              >
                <KeyRound className="w-16 h-16 text-white drop-shadow-lg" style={{
                  animation: 'unlockKey 0.8s ease-out forwards'
                }} />
              </div>

              {/* Checkmark overlay */}
              <div 
                className="absolute inset-4 rounded-full flex items-center justify-center"
                style={{ animation: 'fadeInScale 0.4s ease-out 0.8s both' }}
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{
                      strokeDasharray: 30,
                      strokeDashoffset: 30,
                      animation: 'drawCheck 0.5s ease-out 1s forwards'
                    }} />
                  </svg>
                </div>
              </div>

              {/* Sparkles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-white rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    animation: `sparkle 1s ease-out ${0.5 + i * 0.1}s forwards`,
                    transform: `rotate(${i * 45}deg) translateX(80px)`,
                    opacity: 0
                  }}
                />
              ))}
            </div>

            {/* Success text with gradient */}
            <div style={{ animation: 'slideUp 0.6s ease-out 0.3s both' }}>
              <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent mb-2">
                KIRISH OCHILDI
              </h1>
              <p className="text-xl text-gray-300 font-medium">
                {successGymName}
              </p>
            </div>

            {/* Animated success message */}
            <div 
              className="flex items-center justify-center gap-2 text-emerald-400"
              style={{ animation: 'slideUp 0.6s ease-out 0.5s both' }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-lg font-semibold tracking-wide">MUVAFFAQIYATLI</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Show to admin message */}
            <div 
              className="mt-4 p-4 bg-amber-500/20 border-2 border-amber-400/50 rounded-xl"
              style={{ animation: 'pulseGlow 2s ease-in-out infinite, slideUp 0.6s ease-out 0.7s both' }}
            >
              <p className="text-amber-200 text-lg font-semibold animate-pulse">
                Zal adminiga ko'rsating
              </p>
            </div>

            {/* Confirmation button with date/time */}
            <Button
              onClick={() => {
                setShowSuccessAnimation(false);
                setSelectedBooking(null);
              }}
              className="mt-6 px-8 py-6 text-lg font-bold bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 text-white rounded-xl shadow-2xl border-2 border-emerald-400/50"
              style={{ 
                animation: 'slideUp 0.6s ease-out 0.9s both',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.4), 0 10px 40px rgba(0,0,0,0.3)'
              }}
              data-testid="button-confirm-admin"
            >
              <span className="flex flex-col items-center gap-1">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Tasdiqlangan
                </span>
                <span className="text-sm font-normal opacity-90">
                  {new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            </Button>
          </div>

          {/* CSS Animations */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(180deg); }
            }
            @keyframes bounceIn {
              0% { transform: scale(0); opacity: 0; }
              50% { transform: scale(1.2); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes unlockKey {
              0% { transform: rotate(-45deg) scale(0.8); }
              50% { transform: rotate(15deg) scale(1.1); }
              100% { transform: rotate(0deg) scale(1); }
            }
            @keyframes fadeInScale {
              0% { transform: scale(0); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes drawCheck {
              to { stroke-dashoffset: 0; }
            }
            @keyframes slideUp {
              0% { transform: translateY(30px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes sparkle {
              0% { transform: rotate(var(--rotation)) translateX(40px) scale(0); opacity: 1; }
              100% { transform: rotate(var(--rotation)) translateX(100px) scale(1); opacity: 0; }
            }
            @keyframes pulseGlow {
              0%, 100% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.4), 0 10px 40px rgba(0,0,0,0.3); }
              50% { box-shadow: 0 0 50px rgba(245, 158, 11, 0.6), 0 10px 50px rgba(0,0,0,0.4); }
            }
          `}</style>
        </div>
      )}

      {/* Time Slot Selection Dialog - Modern */}
      <Dialog open={!!selectedGymForBooking} onOpenChange={(open) => {
        if (!open) {
          setSelectedGymForBooking(null);
          setSelectedTimeSlot(null);
          setSelectedBookingDate('');
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col" data-testid="dialog-select-time-slot">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {t('home.gym_slots_title')}
            </DialogTitle>
            <DialogDescription>
              {selectedGymForBooking?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Location Button */}
            {selectedGymForBooking && (selectedGymForBooking.latitude && selectedGymForBooking.longitude || selectedGymForBooking.address) && (
              <Button
                variant="outline"
                size="sm"
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
                {t('map.title_short')}
              </Button>
            )}

            {/* Time Slots Grid */}
            {timeSlotsData?.timeSlots && timeSlotsData.timeSlots.length > 0 ? (
              (() => {
                const availableSlots = timeSlotsData.timeSlots.filter(slot => slot.availableSpots > 0);
                const dayOrder = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
                const dayShort: Record<string, string> = {
                  'Dushanba': 'Du', 'Seshanba': 'Se', 'Chorshanba': 'Ch',
                  'Payshanba': 'Pa', 'Juma': 'Ju', 'Shanba': 'Sh', 'Yakshanba': 'Ya'
                };
                const groupedByDay = availableSlots.reduce((acc, slot) => {
                  if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
                  acc[slot.dayOfWeek].push(slot);
                  return acc;
                }, {} as Record<string, TimeSlot[]>);
                const sortedDays = Object.keys(groupedByDay).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

                // Calculate dates for each day of the week
                const today = new Date();
                const currentDayIndex = (today.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
                const getDayDate = (dayName: string) => {
                  const targetDayIndex = dayOrder.indexOf(dayName);
                  const daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7 || 7;
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() + daysUntilTarget);
                  return targetDate;
                };

                return (
                  <div className="space-y-3">
                    {sortedDays.map((day) => {
                      const dayDate = getDayDate(day);
                      const formattedDate = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
                      const displayDate = dayDate.toLocaleDateString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', { 
                        day: '2-digit', 
                        month: 'long',
                        year: 'numeric'
                      });
                      
                      return (
                        <div key={day} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-medium">
                              {dayShort[day] || day}
                            </Badge>
                            <span className="text-sm font-medium">{day}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{displayDate}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {groupedByDay[day].map((slot) => {
                              const isSelected = selectedTimeSlot?.id === slot.id;
                              const spotsPercent = (slot.availableSpots / slot.capacity) * 100;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  className={`relative w-full p-3 rounded-lg border-2 text-left transition-all ${
                                    isSelected
                                      ? 'border-primary bg-primary/10 shadow-sm'
                                      : 'border-border hover:border-primary/50 bg-card'
                                  }`}
                                  onClick={() => {
                                    setSelectedTimeSlot(slot);
                                    setSelectedBookingDate(formattedDate);
                                  }}
                                  data-testid={`card-time-slot-${slot.id}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                      }`}>
                                        <Clock className="h-5 w-5" />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-sm">
                                          {slot.startTime} - {slot.endTime}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full ${
                                                spotsPercent > 50 ? 'bg-green-500' : spotsPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                                              }`}
                                              style={{ width: `${spotsPercent}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {slot.availableSpots} joy
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-6 bg-muted/50 rounded-lg">
                <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {t('home.no_slots')}
                </p>
              </div>
            )}

            </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button
              onClick={handleConfirmBooking}
              disabled={bookGymMutation.isPending}
              className="flex-1"
              data-testid="button-confirm-booking"
            >
              {bookGymMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('common.loading')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('home.confirm')}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedGymForBooking(null);
                setSelectedTimeSlot(null);
                setSelectedBookingDate('');
              }}
              data-testid="button-cancel-booking"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}