import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
}

const packages: CreditPackage[] = [
  { credits: 6, price: 180000 },
  { credits: 13, price: 350000, isPopular: true },
  { credits: 24, price: 650000 },
];

export default function PurchaseCreditsDialog({
  isOpen,
  onClose,
  onPurchase
}: PurchaseCreditsDialogProps) {
  const { toast } = useToast();

  const purchaseCreditsMutation = useMutation({
    mutationFn: async (credits: number) => {
      const response = await apiRequest('/api/purchase-credits', 'POST', { credits });
      return response.json();
    },
    onSuccess: (data, credits) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Muvaffaqiyatli!",
        description: `${credits} kredit hisobingizga qo'shildi`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Kredit qo'shishda xatolik yuz berdi",
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
          <DialogTitle className="font-display text-2xl">Kredit sotib olish</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-2xl">{pkg.credits} kredit</p>
                  <p className="text-muted-foreground text-sm">
                    {pkg.price.toLocaleString()} so'm
                  </p>
                  <p className="text-muted-foreground text-xs">
                    30 kun amal qiladi
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