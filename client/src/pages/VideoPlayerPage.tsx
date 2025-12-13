import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import type { OnlineClass, VideoCollection } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VideoPlayerPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data: classesData } = useQuery<{ classes: OnlineClass[] }>({
    queryKey: ['/api/classes'],
    queryFn: () => fetch('/api/classes', { credentials: 'include' }).then(res => res.json()),
  });

  const video = classesData?.classes?.find(c => c.id === id);

  const { data: collectionData } = useQuery<{ collection: VideoCollection }>({
    queryKey: ['/api/collections', video?.collectionId],
    queryFn: () => fetch(`/api/collections/${video?.collectionId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!video?.collectionId,
  });

  const collection = collectionData?.collection;

  const isDirectVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const isYouTube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isVimeo = (url: string) => {
    return url.includes('vimeo.com');
  };

  const getEmbedUrl = (url: string) => {
    // YouTube URL konvertatsiyasi
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Vimeo URL konvertatsiyasi
    if (url.includes('vimeo.com/')) {
      // Agar allaqachon embed URL bo'lsa, o'zgartirmaslik
      if (url.includes('player.vimeo.com/video/')) {
        return url;
      }
      // Oddiy Vimeo URL ni embed formatga o'zgartirish
      const videoId = url.split('vimeo.com/')[1].split('?')[0].split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }

    // Google Drive embed konvertatsiyasi
    if (url.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }
    }

    // Loom embed konvertatsiyasi
    if (url.includes('loom.com/share/')) {
      const videoId = url.split('loom.com/share/')[1].split('?')[0];
      return `https://www.loom.com/embed/${videoId}`;
    }

    // Agar allaqachon embed URL bo'lsa yoki boshqa platformalar
    return url;
  };

  const handleBack = () => {
    if (video?.collectionId) {
      navigate(`/my-courses/${video.collectionId}`);
    } else {
      navigate('/courses');
    }
  };

  if (!video) {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="relative z-10">
          <div className="container mx-auto p-6">
            <div className="text-center py-8">Video topilmadi</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="relative z-10">
        <div className="container mx-auto p-6 pb-24">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-6"
            data-testid="button-back-collection"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="aspect-video bg-black">
                  {isDirectVideo(video.videoUrl) ? (
                    // To'g'ridan-to'g'ri video fayllar uchun HTML5 video player
                    <video
                      src={video.videoUrl}
                      controls
                      className="w-full h-full"
                      data-testid="video-player"
                    >
                      Brauzeringiz video playbackni qo'llab-quvvatlamaydi.
                    </video>
                  ) : isYouTube(video.videoUrl) || isVimeo(video.videoUrl) ? (
                    // YouTube/Vimeo uchun iframe
                    <iframe
                      src={getEmbedUrl(video.videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      data-testid="iframe-video-player"
                    />
                  ) : (
                    // Boshqa provayderlar uchun iframe (Google Drive, Loom, va h.k.)
                    <iframe
                      src={video.videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      data-testid="iframe-video-player"
                    />
                  )}
                </div>
              </Card>

              <div className="mt-6">
                <h1 className="text-2xl font-display font-bold mb-3" data-testid="text-video-title">
                  {video.title}
                </h1>

                <div className="flex items-center gap-4 mb-4">
                  {video.duration && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{video.duration} daqiqa</span>
                    </div>
                  )}
                  {video.instructor && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{video.instructor}</span>
                    </div>
                  )}
                  {video.category && (
                    <Badge variant="outline">{video.category}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Collection Info */}
            <div className="lg:col-span-1">
              {collection && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">To'plam haqida</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">To'plam nomi</p>
                      <p className="font-semibold">{collection.name}</p>
                    </div>
                    {collection.description && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tavsif</p>
                        <p className="text-sm">{collection.description}</p>
                      </div>
                    )}
                    {collection.thumbnailUrl && (
                      <div>
                        <img
                          src={collection.thumbnailUrl}
                          alt={collection.name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}