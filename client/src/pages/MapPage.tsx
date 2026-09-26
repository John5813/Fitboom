import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import { useLocation } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Crosshair, MapPin, Navigation, Star, X } from "lucide-react";
import type { Gym } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { categoryLabels } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface GymWithRating extends Gym {
  avgRating?: number | null;
  ratingCount?: number;
}

const TASHKENT: [number, number] = [41.311151, 69.279737];

/**
 * Zamonaviy, ixcham xarita nishoni.
 *
 * Ilgari har bir zal ustida doimiy oq yorliq turardi: ular bir-birining
 * ustiga tushardi va xarita chegarasidan chiqib ketardi. Endi nishonda
 * faqat kredit narxi bor, nom esa tanlanganda pastdagi kartada ko'rinadi.
 */
function gymMarkerIcon(credits: number, selected: boolean) {
  const size = selected ? 44 : 36;
  return L.divIcon({
    className: "fitboom-marker",
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50% 50% 50% 8px;
        transform:rotate(-45deg);
        background:${selected ? "hsl(20 91% 48%)" : "hsl(20 91% 55%)"};
        border:2.5px solid #fff;
        box-shadow:0 ${selected ? 6 : 3}px ${selected ? 16 : 8}px rgba(0,0,0,${selected ? 0.35 : 0.22});
        display:flex;align-items:center;justify-content:center;
        transition:all .15s ease;
      ">
        <span style="
          transform:rotate(45deg);color:#fff;font-weight:700;
          font-size:${selected ? 14 : 12}px;line-height:1;font-variant-numeric:tabular-nums;
        ">${credits}</span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function userMarkerIcon() {
  return L.divIcon({
    className: "fitboom-user-marker",
    html: `<div style="
      width:16px;height:16px;border-radius:50%;background:hsl(211 100% 50%);
      border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15),0 2px 6px rgba(0,0,0,.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/** Xaritani tanlangan zalga yumshoq suradi */
function MapController({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

/** Barcha zallar ko'rinadigan qilib masshtablaydi */
function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    }
  }, [points, map]);
  return null;
}

function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function MapPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [isDark, setIsDark] = useState(false);

  const { data: gymsData, isLoading } = useQuery<{ gyms: GymWithRating[] }>({
    queryKey: ["/api/gyms"],
  });

  // Xarita plitalari mavzuga mos bo'lishi uchun
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(p);
        setAccuracy(pos.coords.accuracy);
        setFlyTo(p);
      },
      (err) => console.warn("[Map] Joylashuvni aniqlab bo'lmadi:", err.message),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  };

  useEffect(() => { locate(); }, []);

  const gyms = useMemo(() => {
    const list = (gymsData?.gyms ?? []).filter(
      (g) => g.latitude && g.longitude
        && !Number.isNaN(parseFloat(g.latitude))
        && !Number.isNaN(parseFloat(g.longitude)),
    );
    if (!userLocation) return list;
    // Foydalanuvchi joylashuvi ma'lum bo'lsa — eng yaqinidan tartiblash
    return [...list].sort(
      (a, b) =>
        distanceKm(userLocation, [parseFloat(a.latitude!), parseFloat(a.longitude!)]) -
        distanceKm(userLocation, [parseFloat(b.latitude!), parseFloat(b.longitude!)]),
    );
  }, [gymsData, userLocation]);

  const points = useMemo(
    () => gyms.map((g) => [parseFloat(g.latitude!), parseFloat(g.longitude!)] as [number, number]),
    [gyms],
  );

  const selected = gyms.find((g) => g.id === selectedId) ?? null;

  function selectGym(gym: GymWithRating) {
    setSelectedId(gym.id);
    setFlyTo([parseFloat(gym.latitude!), parseFloat(gym.longitude!)]);
  }

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Sarlavha — mijoz panelining boshqa sahifalari bilan bir xil naqsh */}
      <header className="z-20 flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Orqaga"
          data-testid="button-map-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-display font-bold">{t("map.title")}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {isLoading ? t("common.loading") : `${gyms.length} ta zal xaritada`}
          </p>
        </div>
      </header>

      {/* Xarita butun qolgan balandlikni egallaydi.
          Ilgari u qat'iy 400px edi va telefonda ekranning yarmini bo'sh qoldirardi. */}
      <div className="relative min-h-0 flex-1 lg:flex">
        <div className="relative h-full min-h-0 flex-1">
          <MapContainer
            center={userLocation ?? TASHKENT}
            zoom={13}
            zoomControl={false}
            className="h-full w-full"
            style={{ background: "hsl(var(--muted))" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={tileUrl}
              maxZoom={20}
            />

            <FitBounds points={points} />
            <MapController center={flyTo} zoom={15} />

            {userLocation && (
              <>
                {accuracy && accuracy < 2000 && (
                  <Circle
                    center={userLocation}
                    radius={accuracy}
                    pathOptions={{ color: "hsl(211 100% 50%)", fillOpacity: 0.08, weight: 1 }}
                  />
                )}
                <Marker position={userLocation} icon={userMarkerIcon()} />
              </>
            )}

            {gyms.map((gym) => {
              const lat = parseFloat(gym.latitude!);
              const lng = parseFloat(gym.longitude!);
              return (
                <Marker
                  key={gym.id}
                  position={[lat, lng]}
                  icon={gymMarkerIcon(gym.credits, gym.id === selectedId)}
                  zIndexOffset={gym.id === selectedId ? 1000 : 0}
                  eventHandlers={{ click: () => selectGym(gym) }}
                />
              );
            })}
          </MapContainer>

          {/* Suzuvchi boshqaruvlar */}
          <div className="pointer-events-none absolute inset-0 z-[400]">
            <button
              type="button"
              onClick={locate}
              className="pointer-events-auto absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-background shadow-lg ring-1 ring-border transition-colors hover:bg-muted"
              aria-label={t("map.locate_me")}
              data-testid="button-locate-me"
            >
              <Crosshair className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Tanlangan zal kartasi — xarita ustida, mobil uchun */}
          {selected && (
            <div className="absolute inset-x-3 bottom-3 z-[400] lg:hidden">
              <GymPreviewCard
                gym={selected}
                userLocation={userLocation}
                onClose={() => setSelectedId(null)}
                onOpen={() => navigate(`/gym/${selected.id}`)}
              />
            </div>
          )}
        </div>

        {/* Desktop yon paneli — mobil'da yashiriladi */}
        <aside className="hidden w-[380px] shrink-0 flex-col border-l lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
                ))}
              </div>
            ) : gyms.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {gyms.map((gym) => (
                  <GymListRow
                    key={gym.id}
                    gym={gym}
                    selected={gym.id === selectedId}
                    userLocation={userLocation}
                    onClick={() => selectGym(gym)}
                    onOpen={() => navigate(`/gym/${gym.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobil ro'yxat — xarita ostida, tanlangan zal kartasi bo'lmaganda */}
      {!selected && (
        <div className="max-h-[38dvh] shrink-0 overflow-y-auto border-t bg-background p-3 lg:hidden">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />)}
            </div>
          ) : gyms.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {gyms.map((gym) => (
                <GymListRow
                  key={gym.id}
                  gym={gym}
                  selected={false}
                  userLocation={userLocation}
                  onClick={() => selectGym(gym)}
                  onOpen={() => navigate(`/gym/${gym.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{t("home.no_gyms_on_map")}</p>
    </div>
  );
}

function GymListRow({
  gym, selected, userLocation, onClick, onOpen,
}: {
  gym: GymWithRating;
  selected: boolean;
  userLocation: [number, number] | null;
  onClick: () => void;
  onOpen: () => void;
}) {
  const km = userLocation
    ? distanceKm(userLocation, [parseFloat(gym.latitude!), parseFloat(gym.longitude!)])
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
      data-testid={`card-map-gym-${gym.id}`}
    >
      {gym.imageUrl ? (
        <img src={gym.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          <MapPin className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{gym.name}</p>
        <p className="truncate text-xs text-muted-foreground">{categoryLabels(gym.categories)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="font-semibold tabular-nums text-primary">{gym.credits} kredit</span>
          {km != null && (
            <span className="tabular-nums text-muted-foreground">{km.toFixed(1)} km</span>
          )}
          {gym.avgRating != null && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <Star className="h-3 w-3 fill-amber-400" />
              {gym.avgRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function GymPreviewCard({
  gym, userLocation, onClose, onOpen,
}: {
  gym: GymWithRating;
  userLocation: [number, number] | null;
  onClose: () => void;
  onOpen: () => void;
}) {
  const lat = parseFloat(gym.latitude!);
  const lng = parseFloat(gym.longitude!);
  const km = userLocation ? distanceKm(userLocation, [lat, lng]) : null;

  return (
    <div className="relative rounded-2xl border bg-background p-3 shadow-xl" data-testid="card-map-selected">
      <div className="flex items-start gap-3">
        {gym.imageUrl ? (
          <img src={gym.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 pr-6 text-sm font-bold leading-snug">{gym.name}</p>
          <p className="truncate text-xs text-muted-foreground">{categoryLabels(gym.categories)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
            <span className="font-semibold tabular-nums text-primary">{gym.credits} kredit</span>
            {km != null && <span className="tabular-nums text-muted-foreground">{km.toFixed(1)} km</span>}
            {gym.avgRating != null && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-3 w-3 fill-amber-400" />
                {gym.avgRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-label="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="h-10 flex-1" asChild>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-map-directions"
          >
            <Navigation className="mr-1.5 h-4 w-4" />
            Yo'nalish
          </a>
        </Button>
        <Button className="h-10 flex-1" onClick={onOpen} data-testid="button-map-gym-detail">
          Batafsil
        </Button>
      </div>
    </div>
  );
}
