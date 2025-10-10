import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Gym } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";
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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Eng Yaqin Zallar</h1>
            <p className="text-muted-foreground mt-2">
              Haritada sport zallarni ko'ring va tanlang
            </p>
          </div>
          <Button onClick={handleLocateMe} data-testid="button-locate-me">
            <Navigation className="h-4 w-4 mr-2" />
            Mening Joylashuvim
          </Button>
        </div>
      </div>

      <Card className="p-4">
        {isLoading ? (
          <div className="h-[600px] flex items-center justify-center">
            <p className="text-muted-foreground">Yuklanmoqda...</p>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '600px', width: '100%' }}
            className="rounded-lg"
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
                    <p className="font-semibold">Sizning joylashuvingiz</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Gym markers */}
            {gymsWithLocation.map((gym) => {
              const lat = parseFloat(gym.latitude!);
              const lng = parseFloat(gym.longitude!);
              
              return (
                <Marker key={gym.id} position={[lat, lng]}>
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
                      <p className="text-sm text-muted-foreground mb-2">{gym.category}</p>
                      <div className="flex items-center gap-1 text-sm mb-2">
                        <MapPin className="h-3 w-3" />
                        <span>{gym.address}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{gym.credits} kredit</span>
                        <span className="text-xs text-muted-foreground">{gym.hours}</span>
                      </div>
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
          <p>Haritada ko'rsatish uchun koordinatali zallar yo'q</p>
        </div>
      )}
    </div>
  );
}
