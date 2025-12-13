import { useQuery, useMutation } from "@tanstack/react-query";
import type { VideoCollection, UserPurchase, OnlineClass } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Check, ShoppingCart, PlayCircle, Star, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";

export default function CoursesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: collectionsData, isLoading } = useQuery<{ collections: VideoCollection[] }>({
    queryKey: ['/api/collections'],
  });

  const { data: purchasesData } = useQuery<{ purchases: UserPurchase[] }>({
    queryKey: ['/api/my-purchases'],
  });

  const collections = collectionsData?.collections || [];
  const purchases = purchasesData?.purchases || [];
  const purchasedCollectionIds = new Set(purchases.map(p => p.collectionId));

  const purchaseMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const response = await apiRequest('/api/purchase-collection', 'POST', { collectionId });
      return response.json();
    },
    onSuccess: (data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-purchases'] });
      toast({
        title: "To'plam sotib olindi",
        description: "Video to'plam muvaffaqiyatli sotib olindi",
      });
      navigate(`/my-courses/${collectionId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Sotib olishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  });

  const handlePurchase = (collection: VideoCollection) => {
    purchaseMutation.mutate(collection.id);
  };

  const handleViewCollection = (collectionId: string) => {
    navigate(`/my-courses/${collectionId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">Yuklanmoqda...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold">Video Kurslar</h1>
          <p className="text-muted-foreground mt-2">
            Professional video darsliklar to'plami
          </p>
        </div>

        {collections.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Hozircha video kurslar mavjud emas</p>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => {
              const isPurchased = purchasedCollectionIds.has(collection.id);

              return (
                <Card 
                  key={collection.id} 
                  className="hover-elevate overflow-hidden"
                  data-testid={`card-collection-${collection.id}`}
                >
                  {collection.thumbnailUrl && (
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                      <img 
                        src={collection.thumbnailUrl} 
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                      {isPurchased && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-green-500 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            Sotib olingan
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span>{collection.name}</span>
                    </CardTitle>
                    <CardDescription>
                      {collection.description || "Professional video darsliklar"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <PlayCircle className="h-3 w-3" />
                          {(collection as any).videoCount || 0} ta video
                        </Badge>
                      </div>
                      <div>
                        {collection.isFree ? (
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            <Gift className="h-4 w-4 mr-1" />
                            Bepul
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <p className="text-2xl font-bold">
                              {collection.price.toLocaleString()} sum
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {isPurchased ? (
                      <Button 
                        className="w-full" 
                        onClick={() => handleViewCollection(collection.id)}
                        data-testid={`button-view-${collection.id}`}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Kursni Ko'rish
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handlePurchase(collection)}
                        disabled={purchaseMutation.isPending}
                        data-testid={`button-purchase-${collection.id}`}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {purchaseMutation.isPending ? 'Yuklanmoqda...' : `${collection.price} sum ga sotib olish`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}