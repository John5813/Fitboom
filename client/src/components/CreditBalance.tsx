import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, ShoppingCart, Clock, AlertTriangle } from "lucide-react";

interface CreditBalanceProps {
  credits: number;
  onPurchase: () => void;
  creditExpiryDate?: string | null;
}

export default function CreditBalance({ credits, onPurchase, creditExpiryDate }: CreditBalanceProps) {
  const getRemainingDays = () => {
    if (!creditExpiryDate) return null;
    const expiry = new Date(creditExpiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = getRemainingDays();
  const isExpiringSoon = remainingDays !== null && remainingDays > 0 && remainingDays <= 5;
  const isExpired = remainingDays !== null && remainingDays <= 0;

  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isExpired ? 'bg-destructive/10' : isExpiringSoon ? 'bg-yellow-500/10' : 'bg-primary/10 dark:bg-primary/20'
            }`}>
              {isExpired ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : isExpiringSoon ? (
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              ) : (
                <KeyRound className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kalitlar soni</p>
              <p className="font-display font-bold text-2xl" data-testid="credit-balance">{credits}</p>
              {remainingDays !== null && credits > 0 && (
                <div className={`flex items-center gap-1 mt-1 ${
                  isExpired ? 'text-destructive' : isExpiringSoon ? 'text-yellow-600 dark:text-yellow-500' : ''
                }`}>
                  <Clock className="w-3 h-3" />
                  <p className="text-xs font-medium" data-testid="text-remaining-days">
                    {isExpired
                      ? "Muddat tugadi! Kalit yangilang"
                      : isExpiringSoon
                        ? `Diqqat: ${remainingDays} kun qoldi!`
                        : `${remainingDays} kun qoldi`}
                  </p>
                </div>
              )}
              {isExpired && credits > 0 && (
                <p className="text-xs text-destructive mt-1">
                  Kalitlaringiz muddati o'tgan
                </p>
              )}
            </div>
          </div>
          <Button onClick={onPurchase} variant={isExpired || isExpiringSoon ? "default" : "outline"} size="sm" className="hover-elevate active-elevate-2">
            <Plus className="w-4 h-4 mr-2" />
            {isExpired ? "Yangilash" : "To'ldirish"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}