import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Gym } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import L from "leaflet";

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPage() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.311151, 69.279737]); // Toshkent default

  const { data: gymsData, isLoading } = useQuery<{ gyms: Gym[] }>({
    queryKey: ['/api/gyms'],
  });

  const gyms = gymsData?.gyms || [];

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setUserLocation(userPos);
          setMapCenter(userPos);
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Use Tashkent as fallback
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  // Filter gyms that have valid coordinates
  const gymsWithLocation = gyms.filter(
    gym => gym.latitude && gym.longitude && 
           !isNaN(parseFloat(gym.latitude)) && 
           !isNaN(parseFloat(gym.longitude))
  );

  // Update map center to show gyms if available
  useEffect(() => {
    if (gymsWithLocation.length > 0 && !userLocation) {
      const firstGym = gymsWithLocation[0];
      const lat = parseFloat(firstGym.latitude!);
      const lng = parseFloat(firstGym.longitude!);
      setMapCenter([lat, lng]);
    }
  }, [gymsWithLocation.length, userLocation]);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setUserLocation(userPos);
          setMapCenter(userPos);
        }
      );
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold">{t('map.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('map.desc')}
            </p>
          </div>
          <Button onClick={handleLocateMe} data-testid="button-locate-me">
            <Navigation className="h-4 w-4 mr-2" />
            {t('map.locate_me')}
          </Button>
        </div>
      </div>

      <Card className="p-2 sm:p-4">
        {isLoading ? (
          <div className="h-[400px] sm:h-[600px] flex items-center justify-center">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '400px', width: '100%' }}
            className="rounded-lg sm:h-[600px]"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User location marker */}
            {userLocation && (
              <Marker position={userLocation}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">{t('map.your_location')}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Gym markers */}
            {gymsWithLocation.map((gym) => {
              // Parse coordinates with proper trimming
              const lat = parseFloat(gym.latitude!.toString().trim());
              const lng = parseFloat(gym.longitude!.toString().trim());

              console.log(`Gym: ${gym.name}, Lat: ${lat}, Lng: ${lng}`); // Debug log

              // Custom icon with gym name
              const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `
                  <div style="position: relative;">
                    <img src="${icon}" style="width: 25px; height: 41px;" />
                    <div style="
                      position: absolute;
                      top: -25px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: white;
                      padding: 4px 8px;
                      border-radius: 4px;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                      white-space: nowrap;
                      font-size: 12px;
                      font-weight: 600;
                      color: #000;
                    ">${gym.name}</div>
                  </div>
                `,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              });

              return (
                <Marker key={gym.id} position={[lat, lng]} icon={customIcon}>
                  <Popup>
                    <div className="min-w-[200px]">
                      {gym.imageUrl && (
                        <img 
                          src={gym.imageUrl} 
                          alt={gym.name}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                      )}
                      <h3 className="font-bold text-lg mb-1">{gym.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{gym.categories?.join(', ') || ''}</p>
                      <div className="flex items-center gap-1 text-sm mb-2">
                        <MapPin className="h-3 w-3" />
                        <a 
                          href={`https://www.google.com/maps?q=${lat},${lng}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {t('map.view_on_google')}
                        </a>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{gym.credits} {t('profile.credits_count')}</span>
                        <span className="text-xs text-muted-foreground">{gym.hours}</span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/gym/${gym.id}`)}
                        data-testid={`button-map-gym-detail-${gym.id}`}
                      >
                        Batafsil ko'rish
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </Card>

      {!isLoading && gymsWithLocation.length === 0 && (
        <div className="text-center mt-4 text-muted-foreground">
          <p>{t('home.no_gyms_on_map')}</p>
        </div>
      )}
    </div>
  );
}