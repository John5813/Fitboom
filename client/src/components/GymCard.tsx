import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ExternalLink, ChevronLeft, ChevronRight, Info, CalendarCheck, ImageIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  description?: string;
  facilities?: string;
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
  description,
  facilities,
  onBook
}: GymCardProps) {
  const { t } = useLanguage();
  const [showGallery, setShowGallery] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const allImages = images && images.length > 0 ? images : [imageUrl];

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(0);
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
        className="overflow-hidden min-w-[280px] sm:min-w-[300px] flex-shrink-0 snap-start"
        data-testid={`card-gym-${id}`}
      >
        <div className="relative cursor-pointer" onClick={handleImageClick}>
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-40 object-cover"
          />
          {allImages.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
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
          <div className="space-y-1 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {typeof distance === 'number' 
                  ? `${distance.toFixed(1)} km` 
                  : (distance || t('home.unknown_distance'))}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{hours}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(true);
              }}
              data-testid={`button-gym-details-${id}`}
            >
              <Info className="w-3.5 h-3.5 mr-1.5" />
              Batafsil
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onBook(id);
              }}
              data-testid={`button-gym-book-${id}`}
            >
              <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
              Band qilish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{name}</DialogTitle>
            <DialogDescription>{category}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {imageUrl && (
              <div className="relative cursor-pointer rounded-md overflow-hidden" data-testid={`image-gym-detail-${id}`} onClick={() => { setShowDetails(false); setCurrentImageIndex(0); setShowGallery(true); }}>
                <img src={imageUrl} alt={name} className="w-full h-48 object-cover" />
                {allImages.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {allImages.length} ta rasm
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge>{credits} {t('profile.credits_count')}</Badge>
              <span className="text-sm text-muted-foreground">{hours}</span>
            </div>

            {typeof distance === 'number' && (
              <div className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{distance.toFixed(1)} km masofada</span>
              </div>
            )}

            {description && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Tavsif</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
              </div>
            )}

            {facilities && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Imkoniyatlar</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{facilities}</p>
              </div>
            )}

            {(latitude && longitude) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  className="h-auto p-0 text-sm underline"
                  onClick={() => window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank')}
                  data-testid={`button-gym-maps-${id}`}
                >
                  {t('map.view_on_google')}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => {
                setShowDetails(false);
                onBook(id);
              }}
              data-testid={`button-gym-book-detail-${id}`}
            >
              <CalendarCheck className="w-4 h-4 mr-2" />
              Zalni band qilish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none overflow-hidden sm:rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{name} rasmlari</DialogTitle>
          </DialogHeader>
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
                  className="absolute left-4 text-white rounded-full"
                  onClick={prevImage}
                  data-testid={`button-gallery-prev-${id}`}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 text-white rounded-full"
                  onClick={nextImage}
                  data-testid={`button-gallery-next-${id}`}
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
