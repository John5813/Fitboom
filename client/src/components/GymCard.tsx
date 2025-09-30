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
    <Card className="overflow-hidden hover-elevate" data-testid={`card-gym-${id}`}>
      <div className="relative">
        <img 
          src={imageUrl} 
          alt={name}
          className="w-full h-48 object-cover"
        />
        <Badge 
          className="absolute top-3 right-3 bg-primary text-primary-foreground border-primary-border font-display font-bold text-base"
          data-testid={`badge-credits-${id}`}
        >
          {credits} kredit
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-display font-semibold text-lg mb-1" data-testid={`text-gym-name-${id}`}>
          {name}
        </h3>
        <Badge variant="secondary" className="mb-3 text-xs">
          {category}
        </Badge>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{distance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{hours}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={() => onBook(id)}
          className="w-full hover-elevate active-elevate-2"
          data-testid={`button-book-${id}`}
        >
          Bron qilish
        </Button>
      </CardFooter>
    </Card>
  );
}
