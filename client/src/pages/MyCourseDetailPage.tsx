import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import type { VideoCollection, OnlineClass } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Play, Clock, User as UserIcon, Lock,
  Unlock, CreditCard, Video, ExternalLink
} from "lucide-react";
import { CATEGORIES } from "@shared/categories";

type CollectionWithMeta = VideoCollection & { isPurchased?: boolean; videoCount?: number };

export default function MyCourseDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data: collectionData, isLoading: colLoading } = useQuery<{ collection: CollectionWithMeta }>({
    queryKey: ['/api/collections', id],
    queryFn: () => fetch(`/api/collections/${id}`, { credentials: 'include' }).then(r => r.json()),
  });

  const { data: classesData, isLoading: classesLoading } = useQuery<{ classes: OnlineClass[] }>({
    queryKey: ['/api/classes', id],
    queryFn: () => fetch(`/api/classes?collectionId=${id}`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!collectionData?.collection?.isPurchased,
  });

  const collection = collectionData?.collection;
  const isPurchased = collection?.isPurchased ?? false;
  const classes = classesData?.classes || [];

  const handleVideoClick = (video: OnlineClass) => {
    if (!isPurchased) return;
    if (video.videoUrl.startsWith('http://') || video.videoUrl.startsWith('https://')) {
      window.open(video.videoUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/video/${video.id}`);
    }
  };

  if (colLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-48 bg-muted animate-pulse" />
        <div className="px-4 py-5 space-y-3 max-w-2xl mx-auto">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Video className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Kurs topilmadi</p>
        </div>
      </div>
    );
  }

  const usedCats = CATEGORIES.filter(c => (collection.categories || []).includes(c.id));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative">
        {collection.thumbnailUrl ? (
          <div className="h-52 overflow-hidden">
            <img src={collection.thumbnailUrl} alt={collection.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
          </div>
        ) : (
          <div className="h-52 bg-gradient-to-br from-violet-600 to-purple-700" />
        )}

        {/* Back button */}
        <button
          onClick={() => navigate('/courses')}
          className="absolute top-4 left-4 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          data-testid="button-back-courses"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isPurchased ? (
              <Badge className="bg-emerald-500 text-white border-0 text-xs">
                <Unlock className="h-3 w-3 mr-1" /> Ochilgan
              </Badge>
            ) : collection.isFree ? (
              <Badge className="bg-emerald-500 text-white border-0 text-xs">
                <Unlock className="h-3 w-3 mr-1" /> Bepul
              </Badge>
            ) : (
              <Badge className="bg-orange-500 text-white border-0 text-xs">
                <CreditCard className="h-3 w-3 mr-1" /> {collection.price} kredit
              </Badge>
            )}
            {usedCats.slice(0, 2).map(c => (
              <Badge key={c.id} className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm">{c.name}</Badge>
            ))}
          </div>
          <h1 className="text-xl font-bold text-white leading-tight" data-testid="text-collection-title">
            {collection.name}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
              <Video className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{isPurchased ? classes.length : (collection.videoCount ?? '?')}</p>
              <p className="text-xs text-muted-foreground">Video</p>
            </div>
          </div>
          {isPurchased && classes.length > 0 && (
            <div className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {classes.reduce((s, v) => s + (v.duration || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Daqiqa</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {collection.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{collection.description}</p>
        )}

        {/* Lock warning */}
        {!isPurchased && (
          <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/30 rounded-2xl px-4 py-3 border border-orange-200 dark:border-orange-900">
            <Lock className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {collection.isFree
                ? "Bu kurs bepul — asosiy sahifadan oching"
                : `Bu kursni ochish uchun kurslar sahifasidan ${collection.price} kredit sarflang`}
            </p>
          </div>
        )}

        {/* Videos list */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Video darslar
          </h2>

          {classesLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse mb-2" />)
          ) : !isPurchased ? (
            <div className="text-center py-10 bg-muted/30 rounded-2xl">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Kursni ochgandan so'ng videolar ko'rinadi</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-2xl">
              <Video className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Bu kursda hozircha videolar yo'q</p>
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map((video, index) => (
                <div
                  key={video.id}
                  className="flex gap-3 items-center bg-card border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                  onClick={() => handleVideoClick(video)}
                  data-testid={`card-video-${video.id}`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-16 w-24 rounded-xl overflow-hidden bg-muted shrink-0">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl || collection.thumbnailUrl} alt={video.title}
                        className="h-full w-full object-cover" />
                    ) : collection.thumbnailUrl ? (
                      <img src={collection.thumbnailUrl} alt={video.title}
                        className="h-full w-full object-cover opacity-60" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Play className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white drop-shadow" />
                    </div>
                    <div className="absolute top-1 left-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="text-[9px] text-white font-bold">{index + 1}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" data-testid={`text-video-title-${video.id}`}>
                      {video.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {video.duration ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {video.duration} daq.
                        </span>
                      ) : null}
                      {video.instructor ? (
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" /> {video.instructor}
                        </span>
                      ) : null}
                    </div>
                    {video.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{video.description}</p>
                    )}
                  </div>

                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
