import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, QrCode, X, AlertCircle } from "lucide-react";

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
  scheduledEndTime
}: BookingCardProps) {
  const openMap = () => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    } else if (gymAddress) {
      window.open(gymAddress, '_blank');
    }
  };

  const isMissed = status === 'missed';
  const displayTime = scheduledStartTime && scheduledEndTime 
    ? `${scheduledStartTime} - ${scheduledEndTime}` 
    : time;

  return (
    <Card 
      className={`hover-elevate ${isMissed ? 'border-2 border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`} 
      data-testid={`card-booking-${id}`}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative">
            <img
              src={gymImage}
              alt={gymName}
              className={`w-20 h-20 rounded-md object-cover ${isMissed ? 'opacity-60 grayscale' : ''}`}
            />
            {isMissed && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/30 rounded-md">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold ${isMissed ? 'text-red-600 dark:text-red-400' : ''}`} data-testid={`text-booking-gym-${id}`}>
                {gymName}
              </h3>
              {isMissed && (
                <Badge variant="destructive" className="text-xs">
                  Ulgirmadingiz
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className={`w-3 h-3 ${isMissed ? 'text-red-500' : ''}`} />
                <span className={isMissed ? 'text-red-600 dark:text-red-400' : ''}>
                  {date} • {displayTime}
                </span>
              </div>
            </div>
            {!isMissed ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onScanQR(id)}
                  data-testid={`button-qr-${id}`}
                >
                  <QrCode className="w-3 h-3 mr-1" />
                  QR Skanerlash
                </Button>
                {(latitude && longitude) || gymAddress ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openMap}
                    data-testid={`button-map-${id}`}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Harita
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onCancel(id)}
                  data-testid={`button-cancel-${id}`}
                >
                  <X className="w-3 h-3 mr-1" />
                  Bekor qilish
                </Button>
              </div>
            ) : (
              <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-600 dark:text-red-400">
                Bu bron vaqtidan o'tib ketganligi sababli bekor qilindi.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}