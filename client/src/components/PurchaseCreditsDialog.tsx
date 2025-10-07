import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreditPackage {
  credits: number;
  price: number;
  isPopular?: boolean;
}

interface PurchaseCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase?: (credits: number, price: number) => void;
}

const packages: CreditPackage[] = [
  { credits: 6, price: 5 },
  { credits: 13, price: 10, isPopular: true },
  { credits: 24, price: 18 },
];

export default function PurchaseCreditsDialog({
  isOpen,
  onClose,
  onPurchase
}: PurchaseCreditsDialogProps) {
  const { toast } = useToast();

  const createCheckoutMutation = useMutation({
    mutationFn: async (credits: number) => {
      const response = await apiRequest('/api/create-checkout-session', 'POST', { credits });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "To'lovni boshlashda xatolik yuz berdi",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = async (credits: number, price: number) => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credits }),
      });

      if (!response.ok) {
        throw new Error('To\'lov sessiyasi yaratilmadi');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('To\'lov URL topilmadi');
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Show error to user via toast or other UI feedback
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Kredit sotib olish</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {packages.map((pkg) => (
            <Card
              key={pkg.credits}
              className={`p-4 relative hover-elevate cursor-pointer ${
                pkg.isPopular ? 'border-primary' : ''
              }`}
              onClick={() => handlePurchase(pkg.credits, pkg.price)}
              data-testid={`card-package-${pkg.credits}`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold">
                    Mashhur
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-2xl">{pkg.credits} kredit</p>
                  <p className="text-muted-foreground text-sm">
                    ${pkg.price}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={createCheckoutMutation.isPending}
                  data-testid={`button-buy-${pkg.credits}`}
                >
                  {createCheckoutMutation.isPending ? 'Yuklanmoqda...' : 'Sotib olish'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}