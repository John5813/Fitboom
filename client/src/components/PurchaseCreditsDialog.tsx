import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, KeyRound, CreditCard, Upload, AlertCircle, Copy, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

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

const CARD_NUMBER = "9860160104562378";
const CARD_HOLDER = "Javlonbek Mo'ydinov";

type Step = 'packages' | 'payment';

export default function PurchaseCreditsDialog({
  isOpen,
  onClose,
  creditExpiryDate,
  currentCredits = 0
}: PurchaseCreditsDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('packages');
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remainingFileInputRef = useRef<HTMLInputElement>(null);

  const { data: activePaymentData } = useQuery<{ payment: any }>({
    queryKey: ['/api/credit-payments/active'],
    enabled: isOpen,
  });

  const activePayment = activePaymentData?.payment;
  const showRemainingPayment = activePayment && activePayment.status === 'partial' && activePayment.remainingAmount > 0;

  useEffect(() => {
    if (isOpen) {
      setStep('packages');
      setSelectedPackage(null);
    }
  }, [isOpen]);

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

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setStep('payment');
  };

  const handleUploadReceipt = async (file: File, isRemaining: boolean = false) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      let endpoint: string;
      if (isRemaining && activePayment) {
        endpoint = `/api/credit-payments/${activePayment.id}/receipt-remaining`;
      } else if (selectedPackage) {
        formData.append('credits', String(selectedPackage.credits));
        formData.append('price', String(selectedPackage.price));
        endpoint = '/api/credit-payments/submit';
      } else {
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        toast({ title: t('payment.success'), description: t('payment.receipt_sent') });
        queryClient.invalidateQueries({ queryKey: ['/api/credit-payments/active'] });
        onClose();
      } else {
        const err = await response.json();
        toast({ title: t('payment.error'), description: err.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: t('payment.error'), description: t('payment.upload_error'), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isRemaining: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadReceipt(file, isRemaining);
    }
  };

  const copyCardNumber = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    toast({ title: t('payment.copied'), description: CARD_NUMBER });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[360px] max-h-[80vh] overflow-y-auto p-0 rounded-2xl border-none">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            {step === 'payment' && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setStep('packages')}
                data-testid="button-back-to-packages"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="font-display text-lg">{t('payment.buy_keys')}</DialogTitle>
              <DialogDescription className="text-xs">
                {hasActiveSubscription ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t('payment.subscription_active')}: {remainingDays} {t('payment.days_left')}
                  </span>
                ) : (
                  <span>{t('payment.new_subscription')}</span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {showRemainingPayment && step === 'packages' && (
          <div className="px-4 pb-2">
            <Card className="p-3 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{t('payment.remaining_payment')}</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-300 mt-1">
                    {t('payment.unpaid_amount')}: {activePayment.remainingAmount.toLocaleString()} {t('payment.som')}
                  </p>
                  <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1 font-medium">
                    {t('payment.remaining_desc')}
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={remainingFileInputRef}
                    onChange={(e) => handleFileChange(e, true)}
                    data-testid="input-remaining-receipt-file"
                  />

                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-2 w-full text-xs font-bold"
                    disabled={uploading}
                    onClick={() => remainingFileInputRef.current?.click()}
                    data-testid="button-pay-remaining"
                  >
                    {uploading ? t('payment.uploading') : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        {t('payment.pay_remaining')} ({activePayment.remainingAmount.toLocaleString()} {t('payment.som')})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {step === 'packages' && (
          <div className="px-4 pb-4 space-y-2.5">
            {packages.map((pkg) => (
              <Card
                key={pkg.credits}
                className={`p-3 relative hover-elevate cursor-pointer ${pkg.isPopular ? 'border-primary' : ''}`}
                onClick={() => handleSelectPackage(pkg)}
                data-testid={`card-package-${pkg.credits}`}
              >
                {pkg.isPopular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="text-[10px] px-2 py-0">{t('payment.popular')}</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{pkg.credits} {t('payment.keys')}</p>
                      <p className="text-muted-foreground text-xs">{pkg.price.toLocaleString()} {t('payment.som')}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    data-testid={`button-buy-${pkg.credits}`}
                  >
                    {t('payment.buy')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {step === 'payment' && selectedPackage && (
          <div className="px-4 pb-4 space-y-3">
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold">{t('payment.card_info')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-background rounded-md p-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('payment.card_number')}</p>
                    <p className="font-mono font-bold text-sm tracking-wider">{CARD_NUMBER.replace(/(.{4})/g, '$1 ').trim()}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={copyCardNumber} data-testid="button-copy-card">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-background rounded-md p-2">
                  <p className="text-[10px] text-muted-foreground">{t('payment.card_holder')}</p>
                  <p className="font-semibold text-sm">{CARD_HOLDER}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('payment.amount_to_pay')}</p>
                <p className="text-2xl font-bold text-primary">
                  {selectedPackage.price.toLocaleString()} {t('payment.som')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selectedPackage.credits} {t('payment.keys')}
                </p>
              </div>
            </Card>

            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('payment.transfer_instruction')}</p>
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e, false)}
              data-testid="input-receipt-file"
            />

            <Button
              className="w-full"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-send-receipt"
            >
              {uploading ? (
                <span>{t('payment.uploading')}</span>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {t('payment.send_receipt')}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
