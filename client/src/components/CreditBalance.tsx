import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, AlertTriangle, Clock, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreditBalanceProps {
  credits: number;
  onPurchase: () => void;
  creditExpiryDate?: string | null;
}

export default function CreditBalance({ credits, onPurchase, creditExpiryDate }: CreditBalanceProps) {
  const { t } = useLanguage();
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
    <Card className="glass-card border-2 border-transparent bg-gradient-to-r from-yellow-400 via-green-400 to-green-500 p-[2px]">
      <div className="bg-background rounded-[calc(0.5rem-2px)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isExpired ? 'bg-destructive/10' : isExpiringSoon ? 'bg-yellow-500/10' : 'bg-gradient-to-br from-yellow-400 to-green-500 bg-opacity-10'
              }`}>
                {isExpired ? (
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                ) : isExpiringSoon ? (
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                ) : (
                  <KeyRound className="w-6 h-6 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profile.credits_title')}</p>
                <p className="font-display font-bold text-2xl bg-gradient-to-r from-yellow-600 to-green-600 bg-clip-text text-transparent" data-testid="credit-balance">{credits}</p>
              {remainingDays !== null && credits > 0 && (
                <div className={`flex items-center gap-1 mt-1 ${
                  isExpired ? 'text-destructive' : isExpiringSoon ? 'text-yellow-600 dark:text-yellow-500' : ''
                }`}>
                  <Clock className="w-3 h-3" />
                  <p className="text-xs font-medium" data-testid="text-remaining-days">
                    {isExpired
                      ? t('profile.expired_message')
                      : isExpiringSoon
                        ? `${t('profile.expiring_soon')} ${remainingDays} ${t('profile.days_left')}`
                        : `${remainingDays} ${t('profile.days_left')}`}
                  </p>
                </div>
              )}
            </div>
          </div>
          <Button onClick={onPurchase} variant={isExpired || isExpiringSoon ? "default" : "outline"} size="sm" className="hover-elevate active-elevate-2">
            <KeyRound className="w-4 h-4 mr-2" />
            {isExpired ? t('profile.renew') : t('profile.topup')}
          </Button>
        </div>
        </CardContent>
      </div>
    </Card>
  );
}