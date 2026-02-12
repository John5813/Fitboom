import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, KeyRound, CreditCard, Upload, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

type Step = 'packages' | 'payment' | 'upload';

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
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: activePaymentData } = useQuery<{ payment: any }>({
    queryKey: ['/api/credit-payments/active'],
    enabled: isOpen,
  });

  const activePayment = activePaymentData?.payment;

  // Qayta kirganda agar to'lov kutilayotgan holatda bo'lsa (pending) 
  // va foydalanuvchi hali paketlar bosqichida bo'lsa, uni to'lov bosqichiga o'tkazamiz
  useEffect(() => {
    if (isOpen && activePayment && activePayment.status === 'pending' && step === 'packages') {
      setStep('payment');
    }
  }, [isOpen, activePayment, step]);

  useEffect(() => {
    if (!isOpen) {
      setStep('packages');
      setSelectedPackage(null);
      setPaymentId(null);
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

  const createPaymentMutation = useMutation({
    mutationFn: async (pkg: CreditPackage) => {
      const response = await apiRequest('/api/credit-payments', 'POST', {
        credits: pkg.credits,
        price: pkg.price,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPaymentId(data.payment.id);
      setStep('payment');
      queryClient.invalidateQueries({ queryKey: ['/api/credit-payments/active'] });
    },
    onError: (error: any) => {
      if (error.message?.includes('kutilayotgan')) {
        toast({ title: t('payment.error'), description: t('payment.pending_exists'), variant: "destructive" });
      } else {
        toast({ title: t('payment.error'), description: error.message, variant: "destructive" });
      }
    },
  });

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    createPaymentMutation.mutate(pkg);
  };

  const handleUploadReceipt = async (file: File, isRemaining: boolean = false) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('receipt', file);

    const pid = isRemaining ? activePayment?.id : paymentId;
    const endpoint = isRemaining 
      ? `/api/credit-payments/${pid}/receipt-remaining`
      : `/api/credit-payments/${pid}/receipt`;

    try {
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

  const displayPrice = selectedPackage?.price || 0;
  const showRemainingPayment = activePayment && activePayment.status === 'partial' && activePayment.remainingAmount > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[360px] max-h-[80vh] overflow-y-auto p-0 rounded-2xl border-none">
        <DialogHeader className="p-4 pb-2">
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
        </DialogHeader>

        {showRemainingPayment && step === 'packages' && (
          <div className="px-4 pb-2">
            <Card className="p-3 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">{t('payment.remaining_payment')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activePayment.credits} {t('payment.keys_for')} {activePayment.remainingAmount.toLocaleString()} {t('payment.som')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t('payment.remaining_desc')}</p>
                  <Button
                    size="sm"
                    className="mt-2 w-full text-xs"
                    onClick={() => {
                      setSelectedPackage({ credits: activePayment.credits, price: activePayment.remainingAmount });
                      setStep('payment');
                    }}
                    data-testid="button-pay-remaining"
                  >
                    {t('payment.pay_remaining')} ({activePayment.remainingAmount.toLocaleString()} {t('payment.som')})
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
                    disabled={createPaymentMutation.isPending}
                    data-testid={`button-buy-${pkg.credits}`}
                  >
                    {createPaymentMutation.isPending ? '...' : t('payment.buy')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {step === 'payment' && (
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
                  {(showRemainingPayment ? activePayment.remainingAmount : displayPrice).toLocaleString()} {t('payment.som')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selectedPackage?.credits} {t('payment.keys')}
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
              onChange={(e) => handleFileChange(e, !!showRemainingPayment)}
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
