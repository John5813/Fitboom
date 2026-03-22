import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, QrCode, X, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BookingCardProps {
  id: string;
  gymName: string;
  gymImage: string;
  date: string;
  time: string;
  latitude?: string;
  longitude?: string;
  onScanQR: (id: string) => void;
  onCancel: (id: string) => void;
  gymAddress?: string;
  status?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  isCompleted?: boolean;
  existingRating?: number | null;
  onRate?: (bookingId: string, rating: number) => void;
}

export default function BookingCard({
  id,
  gymName,
  gymImage,
  date,
  time,
  latitude,
  longitude,
  onScanQR,
  onCancel,
  gymAddress,
  status,
  scheduledStartTime,
  scheduledEndTime,
  isCompleted,
  existingRating,
  onRate,
}: BookingCardProps) {
  const { t } = useLanguage();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(existingRating ?? 0);

  const openMap = () => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    } else if (gymAddress) {
      window.open(gymAddress, '_blank');
    }
  };

  const displayTime = scheduledStartTime && scheduledEndTime 
    ? `${scheduledStartTime} - ${scheduledEndTime}` 
    : time;

  const canRate = isCompleted && onRate;

  const handleRate = () => {
    if (selectedStar > 0 && onRate) {
      onRate(id, selectedStar);
      setShowRatingDialog(false);
    }
  };

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-booking-${id}`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative">
              <img
                src={gymImage}
                alt={gymName}
                className="w-20 h-20 rounded-md object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold" data-testid={`text-booking-gym-${id}`}>
                  {gymName}
                </h3>
                {existingRating != null && (
                  <span className="flex items-center gap-0.5 text-yellow-500 text-xs" data-testid={`text-booking-rating-${id}`}>
                    <Star className="w-3 h-3 fill-yellow-500" />
                    {existingRating}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{date} • {displayTime}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onScanQR(id)}
                  data-testid={`button-qr-${id}`}
                >
                  <QrCode className="w-3 h-3 mr-1" />
                  {t('nav.scanner')}
                </Button>
                {(latitude && longitude) || gymAddress ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openMap}
                    data-testid={`button-map-${id}`}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {t('map.title_short')}
                  </Button>
                ) : null}
                {canRate && existingRating == null && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRatingDialog(true)}
                    data-testid={`button-rate-${id}`}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Baho bering
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onCancel(id)}
                  data-testid={`button-cancel-${id}`}
                >
                  <X className="w-3 h-3 mr-1" />
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="max-w-[320px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Zalni baholang</DialogTitle>
            <DialogDescription>{gymName}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  data-testid={`button-star-${id}-${star}`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setSelectedStar(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      star <= (hoveredStar || selectedStar)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedStar === 0 && "Yulduz tanlang"}
              {selectedStar === 1 && "Juda yomon"}
              {selectedStar === 2 && "Yomon"}
              {selectedStar === 3 && "O'rtacha"}
              {selectedStar === 4 && "Yaxshi"}
              {selectedStar === 5 && "A'lo!"}
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRatingDialog(false)}
                data-testid={`button-rating-cancel-${id}`}
              >
                Bekor
              </Button>
              <Button
                className="flex-1"
                disabled={selectedStar === 0}
                onClick={handleRate}
                data-testid={`button-rating-submit-${id}`}
              >
                Yuborish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
