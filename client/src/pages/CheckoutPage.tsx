import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { VideoCollection } from "@shared/schema";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Link } from "wouter";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

function CheckoutForm({ collection }: { collection: VideoCollection }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "To'lov xatosi",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // To'lov muvaffaqiyatli bo'lgandan so'ng backend'da sotib olishni tasdiqlash
        const response = await apiRequest('/api/confirm-purchase', 'POST', {
          collectionId: collection.id,
          paymentIntentId: paymentIntent.id
        });

        const data = await response.json();

        toast({
          title: "Muvaffaqiyatli!",
          description: data.message || "To'plam muvaffaqiyatli sotib olindi",
        });

        navigate(`/my-courses/${collection.id}`);
      }
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "To'lovda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        data-testid="button-submit-payment"
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {isProcessing ? 'Yuklanmoqda...' : `${collection.price.toLocaleString()} so'm to'lash`}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");

  const { data: collectionData, isLoading } = useQuery<{ collection: VideoCollection }>({
    queryKey: ['/api/collections', id],
    queryFn: () => fetch(`/api/collections/${id}`, { credentials: 'include' }).then(res => res.json()),
  });

  const collection = collectionData?.collection;

  useEffect(() => {
    if (collection && !collection.isFree) {
      // Payment intent yaratish
      apiRequest('/api/create-payment-intent', 'POST', { collectionId: collection.id })
        .then(res => res.json())
        .then(data => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else if (data.error) {
            toast({
              title: "Xatolik",
              description: data.error,
              variant: "destructive",
            });
          }
        })
        .catch(error => {
          toast({
            title: "Xatolik",
            description: error.message || "To'lovni yaratishda xatolik yuz berdi",
            variant: "destructive",
          });
        });
    }
  }, [collection, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center text-muted-foreground">
            <p>To'plam topilmadi</p>
            <Link href="/courses">
              <Button variant="ghost" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kurslar ro'yxatiga qaytish
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (collection.isFree) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <p>Bu to'plam bepul</p>
            <Link href="/courses">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kurslar ro'yxatiga qaytish
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center text-destructive">
            <p>To'lov tizimi sozlanmagan</p>
            <p className="text-sm text-muted-foreground mt-2">
              Administrator bilan bog'laning
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <Link href="/courses">
          <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">To'lov</CardTitle>
            <CardDescription>
              {collection.name} to'plamini sotib olish
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {collection.thumbnailUrl && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={collection.thumbnailUrl}
                  alt={collection.name}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{collection.name}</p>
                  <p className="text-sm text-muted-foreground">{collection.description}</p>
                </div>
                <p className="text-2xl font-bold">
                  {collection.price.toLocaleString()} so'm
                </p>
              </div>
            </div>

            {!clientSecret ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-4">To'lov formasi yuklanmoqda...</p>
              </div>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm collection={collection} />
              </Elements>
            )}

            <div className="text-xs text-muted-foreground text-center">
              To'lovlaringiz Stripe orqali xavfsiz amalga oshiriladi
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
