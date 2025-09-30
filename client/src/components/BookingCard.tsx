import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, QrCode, X } from "lucide-react";

interface BookingCardProps {
  id: string;
  gymName: string;
  gymImage: string;
  date: string;
  time: string;
  onScanQR: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function BookingCard({ 
  id, 
  gymName, 
  gymImage, 
  date, 
  time, 
  onScanQR,
  onCancel
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
    </Card>
  );
}
