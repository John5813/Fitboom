import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, QrCode, X } from "lucide-react";

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
  gymAddress
}: BookingCardProps) {
  const openMap = () => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    } else if (gymAddress) {
      window.open(gymAddress, '_blank');
    }
  };

  return (
    <Card className="hover-elevate" data-testid={`card-booking-${id}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <img
            src={gymImage}
            alt={gymName}
            className="w-20 h-20 rounded-md object-cover"
          />
          <div className="flex-1">
            <h3 className="font-semibold mb-1" data-testid={`text-booking-gym-${id}`}>{gymName}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>{date} • {time}</span>
              </div>
            </div>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}