import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Plus } from "lucide-react";

interface CreditBalanceProps {
  credits: number;
  onPurchase: () => void;
}

export default function CreditBalance({ credits, onPurchase }: CreditBalanceProps) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kredit balansi</p>
              <p className="font-display font-bold text-2xl" data-testid="credit-balance">{credits}</p>
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