import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, AlertTriangle, KeyRound } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  creditExpiryDate?: string | null;
  currentCredits?: number;
}

const packages: CreditPackage[] = [
  { credits: 6, price: 180000 },
  { credits: 13, price: 350000, isPopular: true },
  { credits: 24, price: 650000 },
];

export default function PurchaseCreditsDialog({
  isOpen,
  onClose,
  onPurchase,
  creditExpiryDate,
  currentCredits = 0
}: PurchaseCreditsDialogProps) {
  const { toast } = useToast();

  const getRemainingDays = () => {
    if (!creditExpiryDate) return null;
    const expiry = new Date(creditExpiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = getRemainingDays();
  const hasActiveSubscription = remainingDays !== null && remainingDays > 0;

  const purchaseCreditsMutation = useMutation({
    mutationFn: async (credits: number) => {
      const response = await apiRequest('/api/purchase-credits', 'POST', { credits });
      return response.json();
    },
    onSuccess: (data, credits) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Muvaffaqiyatli!",
        description: `${credits} kalit hisobingizga qo'shildi`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Kalit qo'shishda xatolik yuz berdi",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (credits: number) => {
    purchaseCreditsMutation.mutate(credits);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Kalit sotib olish</DialogTitle>
          <DialogDescription>
            {hasActiveSubscription ? (
              <span className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4" />
                Joriy obuna: {remainingDays} kun qoldi
              </span>
            ) : (
              <span className="text-sm">Yangi 30 kunlik obuna boshlang</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {hasActiveSubscription && (
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <p className="text-muted-foreground">
              Sizda hozirda {currentCredits} kalit bor. Yangi kalitlar mavjud {remainingDays} kun ichida ishlatilishi kerak.
            </p>
          </div>
        )}

        <div className="space-y-3 py-2">
          {packages.map((pkg) => (
            <Card
              key={pkg.credits}
              className={`p-4 relative hover-elevate cursor-pointer ${
                pkg.isPopular ? 'border-primary' : ''
              }`}
              onClick={() => handlePurchase(pkg.credits)}
              data-testid={`card-package-${pkg.credits}`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold">
                    Mashhur
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <KeyRound className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-display font-bold text-2xl">{pkg.credits} kalit</p>
                  <p className="text-muted-foreground text-sm">
                    {pkg.price.toLocaleString()} so'm
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {hasActiveSubscription
                      ? `Mavjud muddatga qo'shiladi`
                      : '30 kun amal qiladi'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(pkg.credits)}
                  disabled={purchaseCreditsMutation.isPending}
                  data-testid={`button-buy-${pkg.credits}`}
                >
                  {purchaseCreditsMutation.isPending ? 'Yuklanmoqda...' : 'Sotib olish'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}