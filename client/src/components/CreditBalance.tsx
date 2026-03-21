import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";
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
    <div
      className="rounded-2xl overflow-hidden shadow-lg"
      style={{
        background: isExpired
          ? "linear-gradient(135deg, #ef4444, #b91c1c)"
          : "linear-gradient(135deg, #4ade80, #16a34a, #166534)",
      }}
    >
      <div className="flex items-center px-4 py-4 gap-3">
        <div className="text-4xl select-none flex-shrink-0">🔑</div>

        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-xs font-medium">{t("profile.credits_title")}</p>
          <p className="text-white font-bold text-xl leading-tight" data-testid="credit-balance">
            {t("profile.credits_title")}: <span className="text-2xl">{credits}</span>
          </p>
          {remainingDays !== null && credits > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              {isExpired || isExpiringSoon ? (
                <AlertTriangle className="w-3 h-3 text-yellow-300" />
              ) : (
                <Clock className="w-3 h-3 text-white/70" />
              )}
              <p className="text-xs text-white/80" data-testid="text-remaining-days">
                {isExpired
                  ? t("profile.expired_message")
                  : isExpiringSoon
                  ? `${t("profile.expiring_soon")} ${remainingDays} ${t("profile.days_left")}`
                  : `${remainingDays} ${t("profile.days_left")}`}
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={onPurchase}
          size="sm"
          className="flex-shrink-0 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold border-0 shadow-md px-4 rounded-xl"
          data-testid="button-topup-credits"
        >
          {isExpired ? t("profile.renew") : t("profile.topup")}
        </Button>
      </div>
    </div>
  );
}
