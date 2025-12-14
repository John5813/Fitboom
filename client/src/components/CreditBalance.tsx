import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Plus, Clock } from "lucide-react";

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
    return diffDays > 0 ? diffDays : 0;
  };

  const remainingDays = getRemainingDays();

  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kredit balansi</p>
              <p className="font-display font-bold text-2xl" data-testid="credit-balance">{credits}</p>
              {remainingDays !== null && credits > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground" data-testid="text-remaining-days">
                    {remainingDays > 0 ? `${remainingDays} kun qoldi` : "Muddat tugadi"}
                  </p>
                </div>
              )}
            </div>
          </div>
          <Button onClick={onPurchase} variant="outline" size="sm" className="hover-elevate active-elevate-2">
            <Plus className="w-4 h-4 mr-2" />
            To'ldirish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}