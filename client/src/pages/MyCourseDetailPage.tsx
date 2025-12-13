import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import type { VideoCollection, OnlineClass, UserPurchase } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Clock, User, Lock, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MyCourseDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data: collectionData, isLoading: collectionLoading } = useQuery<{ collection: VideoCollection }>({
    queryKey: ['/api/collections', id],
    queryFn: () => fetch(`/api/collections/${id}`, { credentials: 'include' }).then(res => res.json()),
  });

  const { data: classesData, isLoading: classesLoading } = useQuery<{ classes: OnlineClass[] }>({
    queryKey: ['/api/classes', id],
    queryFn: () => fetch(`/api/classes?collectionId=${id}`, { credentials: 'include' }).then(res => res.json()),
  });

  const { data: purchasesData } = useQuery<{ purchases: UserPurchase[] }>({
    queryKey: ['/api/my-purchases'],
  });

  const collection = collectionData?.collection;
  const classes = classesData?.classes || [];
  const purchases = purchasesData?.purchases || [];
  const isPurchased = purchases.some(p => p.collectionId === id);

  const handleVideoClick = (videoId: string, videoUrl: string) => {
    if (isPurchased) {
      // Agar URL tashqi havola bo'lsa, yangi tabda ochish
      if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
        window.open(videoUrl, '_blank');
      } else {
        // Ichki video player uchun
        navigate(`/video/${videoId}`);
      }
    }
  };

  if (collectionLoading || classesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">Yuklanmoqda...</div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">To'plam topilmadi</div>
        </div>
      </div>
    );
  }

  // Agar foydalanuvchi sotib olmagan bo'lsa, faqat umumiy ma'lumotlarni ko'rsatish
  const visibleClasses = isPurchased ? classes : [];

  return (
    <div className="min-h-screen bg-background relative">
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-5 pointer-events-none"
        style={{ backgroundImage: 'url(/background-earth.jpg)' }}
      />
      <div className="relative z-10">
      <div className="container mx-auto p-6 pb-24">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/courses')}
          className="mb-6"
          data-testid="button-back-courses"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-display font-bold mb-2" data-testid="text-collection-title">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-muted-foreground mb-4">{collection.description}</p>
              )}
              <div className="flex items-center gap-4">
                <Badge variant="secondary" data-testid="badge-video-count">
                  {isPurchased ? classes.length : '?'} ta video
                </Badge>
                <Badge variant="outline" data-testid="badge-collection-price">
                  {collection.isFree ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Gift className="h-3 w-3 mr-1" />
                      Bepul
                    </Badge>
                  ) : (
                    `${collection.price} sum`
                  )}
                </Badge>
              </div>
            </div>
            {collection.thumbnailUrl && (
              <img
                src={collection.thumbnailUrl}
                alt={collection.name}
                className="w-48 h-32 object-cover rounded-lg ml-6"
                data-testid="img-collection-thumbnail"
              />
            )}
          </div>
        </div>

        {!isPurchased && (
          <Card className="mb-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-900 dark:text-amber-100">
                  Bu to'plamni ko'rish uchun avval sotib olishingiz kerak
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Video Darsliklar</h2>

          {visibleClasses.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{isPurchased ? "Bu to'plamda hozircha videolar yo'q" : "To'plamni sotib olib, videolarni ko'ring"}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {visibleClasses.map((video, index) => (
                <Card
                  key={video.id}
                  className={`overflow-hidden transition-all ${
                    isPurchased ? 'cursor-pointer hover:shadow-md hover:border-primary/50' : 'opacity-75'
                  }`}
                  onClick={() => handleVideoClick(video.id, video.videoUrl)}
                  data-testid={`card-video-${video.id}`}
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative w-28 h-20 flex-shrink-0 rounded-md overflow-hidden">
                      <img
                        src={video.thumbnailUrl || collection.thumbnailUrl}
                        alt={video.title}
                        className={`w-full h-full object-cover ${!isPurchased ? 'blur-sm' : ''}`}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        {isPurchased ? (
                          <Play className="w-8 h-8 text-white" />
                        ) : (
                          <Lock className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <Badge className="absolute top-1 left-1 bg-black/70 text-white border-none text-xs h-5 px-1.5">
                        {index + 1}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1.5 truncate" data-testid={`text-video-title-${video.id}`}>
                        {video.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {video.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{video.duration} daq.</span>
                          </div>
                        )}
                        {video.instructor && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{video.instructor}</span>
                          </div>
                        )}
                        {video.categories && video.categories.length > 0 && (
                          <Badge variant="outline" className="text-xs h-5 px-1.5">{video.categories[0]}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}