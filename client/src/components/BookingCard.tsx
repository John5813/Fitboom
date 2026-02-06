import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, QrCode, X, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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

  return (
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
  );
}