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
          <div className="aspect-[4/3] w-full overflow-hidden">
            <img
              src={allImages[0]}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {allImages.length > 1 && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-lg text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
              <ImageIcon className="w-3.5 h-3.5" />
              {allImages.length} ta rasm
            </div>
          )}
          <Badge
            className="absolute top-3 right-3 bg-primary text-primary-foreground border-primary-border font-display font-bold text-sm px-3 py-1"
            data-testid={`badge-credits-${id}`}
          >
            {credits} {t('profile.credits_count')}
          </Badge>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="font-bold text-xl text-white leading-tight drop-shadow-lg" data-testid={`text-gym-name-${id}`}>
              {name}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-white/90 text-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {typeof distance === 'number' 
                  ? `${distance.toFixed(1)} km` 
                  : (distance || t('home.unknown_distance'))}
              </span>
              <span className="text-white/70 text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                {hours}
              </span>
            </div>
            <p className="text-white/70 text-sm mt-1">{category}</p>
          </div>
        </div>
        <div className="p-3 flex gap-2">
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
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>{category}</DialogDescription>
          </DialogHeader>
          <div>
            <div
              className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden"
              data-testid={`image-gym-detail-${id}`}
              onClick={() => { setShowDetails(false); setCurrentImageIndex(0); setShowGallery(true); }}
            >
              <img src={allImages[0]} alt={name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {allImages.length > 1 && (
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-lg text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {allImages.length} ta rasm
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white font-bold text-2xl leading-tight drop-shadow-lg">
                  {name}
                </h3>
                <p className="text-white/80 text-sm mt-1">{category}</p>
              </div>
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 scrollbar-hide snap-x">
                {allImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative flex-shrink-0 w-20 h-20 cursor-pointer rounded-md overflow-hidden snap-center border-2 border-transparent transition-colors hover-elevate"
                    data-testid={`button-detail-thumbnail-${id}-${idx}`}
                    onClick={() => { setShowDetails(false); setCurrentImageIndex(idx); setShowGallery(true); }}
                  >
                    <img src={img} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{credits} {t('profile.credits_count')}</Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {hours}
                </span>
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none overflow-hidden sm:rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{name} rasmlari</DialogTitle>
            <DialogDescription>Zal rasmlari galereyasi</DialogDescription>
          </DialogHeader>
          <div className="relative flex flex-col items-center justify-center" style={{ height: '85vh' }}>
            <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-lg text-white text-sm px-3 py-1.5 rounded-full font-medium">
              {name}
            </div>
            {allImages.length > 1 && (
              <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-lg text-white text-sm px-3 py-1.5 rounded-full font-medium">
                {currentImageIndex + 1} / {allImages.length}
              </div>
            )}
            <img 
              src={allImages[currentImageIndex]} 
              alt={`${name} gallery ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-md"
            />
            {allImages.length > 1 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white rounded-full bg-white/10 backdrop-blur-sm"
                  onClick={prevImage}
                  data-testid={`button-gallery-prev-${id}`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white rounded-full bg-white/10 backdrop-blur-sm"
                  onClick={nextImage}
                  data-testid={`button-gallery-next-${id}`}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      className={`rounded-full transition-all ${
                        i === currentImageIndex ? "bg-white w-6 h-2" : "bg-white/40 w-2 h-2"
                      }`}
                      data-testid={`button-gallery-dot-${id}-${i}`}
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
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
