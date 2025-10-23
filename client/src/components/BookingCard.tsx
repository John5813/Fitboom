import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, QrCode, X } from "lucide-react";
import { ExternalLink } from "lucide-react"; // Import ExternalLink icon

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
  gymAddress: string; // Added gymAddress prop
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
  gymAddress // Destructure gymAddress
}: BookingCardProps) {
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
              {/* Updated address display */}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm text-left"
                  onClick={() => window.open(gymAddress, '_blank')} // Use gymAddress prop
                >
                  <span className="line-clamp-2">Haritada ko'rish</span>
                  <ExternalLink className="w-3 h-3 ml-1 inline" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onScanQR(id)}
                className="hover-elevate active-elevate-2"
                data-testid={`button-qr-${id}`}
              >
                <QrCode className="w-3 h-3 mr-1" />
                QR kod
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(id)}
                className="hover-elevate active-elevate-2"
                data-testid={`button-cancel-${id}`}
              >
                <X className="w-3 h-3 mr-1" />
                Bekor qilish
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0 flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Button
            onClick={() => onScanQR(id)}
            className="flex-1"
            data-testid={`button-scan-qr-${id}`}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Skanerlash
          </Button>
          <Button
            variant="destructive"
            onClick={() => onCancel(id)}
            data-testid={`button-cancel-booking-${id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {(latitude && longitude) || gymAddress && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (latitude && longitude) {
                window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
              } else if (gymAddress) {
                window.open(gymAddress, '_blank');
              }
            }}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Haritada ko'rish
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}