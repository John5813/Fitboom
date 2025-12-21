import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ExternalLink } from "lucide-react";

interface GymCardProps {
  id: string;
  name: string;
  category: string;
  credits: number;
  distance: string | number | undefined;
  hours: string;
  imageUrl: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  onBook: (id: string) => void;
}

export default function GymCard({
  id,
  name,
  category,
  credits,
  distance,
  hours,
  imageUrl,
  address,
  latitude,
  longitude,
  onBook
}: GymCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover-elevate min-w-[280px] sm:min-w-[300px] flex-shrink-0 snap-start"
      onClick={() => onBook(id)}
      data-testid={`card-gym-${id}`}
    >
      <div className="relative">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-32 object-cover"
        />
        <Badge
          className="absolute top-2 right-2 bg-primary text-primary-foreground border-primary-border font-display font-bold text-xs px-2 py-0.5"
          data-testid={`badge-credits-${id}`}
        >
          {credits} kalit
        </Badge>
      </div>
      <CardContent className="p-3 sm:p-4">
        <h3 className="font-bold text-base sm:text-lg mb-2 truncate" data-testid={`text-gym-name-${id}`}>
          {name}
        </h3>
        <Badge variant="secondary" className="mb-2 text-xs">
          {category}
        </Badge>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {typeof distance === 'number' ? `${distance.toFixed(1)} km` : distance || 'Masofa noma\'lum'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{hours}</span>
          </div>
          {(latitude && longitude) && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <Button
                variant="ghost"
                className="h-auto p-0 text-sm text-left hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
                }}
              >
                Haritada ko'rish
                <ExternalLink className="w-3 h-3 ml-1 inline" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}