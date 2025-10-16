import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";

interface GymCardProps {
  id: string;
  name: string;
  category: string;
  credits: number;
  distance: string;
  hours: string;
  imageUrl: string;
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
  onBook 
}: GymCardProps) {
  return (
    <Card 
      className="overflow-hidden hover-elevate flex-shrink-0 w-52 cursor-pointer transition-transform hover:scale-105" 
      data-testid={`card-gym-${id}`}
      onClick={() => onBook(id)}
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
          {credits} ⭐
        </Badge>
      </div>
      <CardContent className="p-3">
        <h3 className="font-display font-semibold text-sm mb-1 truncate" data-testid={`text-gym-name-${id}`}>
          {name}
        </h3>
        <Badge variant="secondary" className="mb-2 text-xs">
          {category}
        </Badge>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{distance}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{hours}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
