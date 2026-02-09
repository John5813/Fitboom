import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GymCardProps {
  id: string;
  name: string;
  category: string;
  credits: number;
  distance: string | number | undefined;
  hours: string;
  imageUrl: string;
  images?: string[];
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
  images = [],
  address,
  latitude,
  longitude,
  onBook
}: GymCardProps) {
  const { t } = useLanguage();
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use images array if available, otherwise fallback to imageUrl
  const allImages = images && images.length > 0 ? images : [imageUrl];

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGallery(true);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <>
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
            onClick={handleImageClick}
          />
          {allImages.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {allImages.length}
            </div>
          )}
          <Badge
            className="absolute top-2 right-2 bg-primary text-primary-foreground border-primary-border font-display font-bold text-xs px-2 py-0.5"
            data-testid={`badge-credits-${id}`}
          >
            {credits} {t('profile.credits_count')}
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
                {typeof distance === 'number' ? `${distance.toFixed(1)} km` : distance || t('profile.unknown_gym')}
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
                  {t('map.view_on_google')}
                  <ExternalLink className="w-3 h-3 ml-1 inline" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none overflow-hidden sm:rounded-2xl">
          <div className="relative aspect-video flex items-center justify-center">
            <img 
              src={allImages[currentImageIndex]} 
              alt={`${name} gallery ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {allImages.length > 1 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-4 text-white hover:bg-white/20 rounded-full"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 text-white hover:bg-white/20 rounded-full"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentImageIndex ? "bg-white w-4" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}