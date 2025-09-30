import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface CreditBalanceProps {
  credits: number;
  onPurchase: () => void;
}

export default function CreditBalance({ credits, onPurchase }: CreditBalanceProps) {
  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 border-primary-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-primary-foreground/80 text-sm mb-1">Sizning kreditingiz</p>
          <p className="font-display font-bold text-5xl text-primary-foreground">{credits}</p>
        </div>
        <Button 
          onClick={onPurchase}
          variant="outline"
          className="bg-white/90 backdrop-blur-sm hover:bg-white border-white/40 text-primary hover-elevate active-elevate-2"
          data-testid="button-purchase-credits"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Sotib olish
        </Button>
      </div>
    </Card>
  );
}
