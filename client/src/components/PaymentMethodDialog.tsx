import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Send, ExternalLink } from "lucide-react";

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCardTransfer: () => void;
}

export default function PaymentMethodDialog({ isOpen, onClose, onSelectCardTransfer }: PaymentMethodDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showTelegramRequired, setShowTelegramRequired] = useState(false);

  const { data: telegramStatus, refetch: refetchTelegramStatus } = useQuery<{ linked: boolean; botUrl: string }>({
    queryKey: ['/api/check-telegram-linked'],
    enabled: isOpen,
    staleTime: 30000,
  });

  const handleClick = () => {
    toast({ title: "Tez kunda", description: "Click orqali to'lov tez orada qo'shiladi" });
    onClose();
  };

  const handlePayme = () => {
    toast({ title: "Tez kunda", description: "Payme orqali to'lov tez orada qo'shiladi" });
    onClose();
  };

  const handleCardTransfer = async () => {
    await refetchTelegramStatus();
    const linked = telegramStatus?.linked ?? !!(user as any)?.chatId;
    if (!linked) {
      setShowTelegramRequired(true);
      return;
    }
    onClose();
    onSelectCardTransfer();
  };

  const handleOpenBot = () => {
    const botUrl = telegramStatus?.botUrl || 'https://t.me/uzfitboom_bot?start=auth';
    window.open(botUrl, '_blank');
  };

  const handleBotConnected = async () => {
    const result = await refetchTelegramStatus();
    if (result.data?.linked) {
      setShowTelegramRequired(false);
      onClose();
      onSelectCardTransfer();
    } else {
      toast({
        title: "Telegram hali ulanmagan",
        description: "Botdan /start bosib, telefon raqamingizni ulang",
        variant: "destructive",
      });
    }
  };

  const methods = [
    {
      id: "click",
      label: "Click",
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-[#00ADEF] flex items-center justify-center flex-shrink-0">
          <div className="flex items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
            <span className="text-white font-bold text-sm leading-none">click</span>
          </div>
        </div>
      ),
      onClick: handleClick,
    },
    {
      id: "payme",
      label: "Payme",
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-white border flex items-center justify-center flex-shrink-0">
          <div className="flex items-baseline">
            <span className="font-bold text-gray-900 text-base leading-none">Pay</span>
            <span className="font-bold text-sm leading-none border-b-2 border-[#1B61F5] text-[#1B61F5]">me</span>
          </div>
        </div>
      ),
      onClick: handlePayme,
    },
    {
      id: "card",
      label: "Kartaga o'tkazish",
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-[#5B5FEF] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-2xl">K</span>
        </div>
      ),
      onClick: handleCardTransfer,
    },
  ];

  return (
    <>
      <Dialog open={isOpen && !showTelegramRequired} onOpenChange={onClose}>
        <DialogContent className="w-[92vw] max-w-[380px] p-0 rounded-3xl border-none shadow-xl">
          <DialogHeader className="px-5 pt-6 pb-2">
            <DialogTitle className="text-xl font-bold text-foreground">
              To'lov usulini tanlang
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-6 space-y-3">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={method.onClick}
                data-testid={`button-payment-${method.id}`}
                className="w-full flex items-center gap-4 bg-background border border-border rounded-2xl px-4 py-4 hover:bg-muted/50 active:scale-[0.98] transition-all duration-150 text-left"
              >
                {method.icon}
                <span className="font-semibold text-base text-foreground">{method.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram bot ulanish kerak dialogi */}
      <Dialog open={showTelegramRequired} onOpenChange={(open) => { if (!open) setShowTelegramRequired(false); }}>
        <DialogContent className="w-[92vw] max-w-[380px] p-0 rounded-3xl border-none shadow-xl" data-testid="dialog-telegram-required">
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Send className="text-blue-500" size={28} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Telegram bot kerak</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Kartaga o'tkazish orqali to'lov qilish uchun avval <strong>@uzfitboom_bot</strong> ga ulanishingiz kerak.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Botda <strong>/start</strong> bosib, telefon raqamingizni ulang. Keyin bu yerga qayting.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleOpenBot}
                className="w-full h-11 rounded-2xl bg-blue-500 hover:bg-blue-600 font-semibold gap-2"
                data-testid="button-open-telegram-bot"
              >
                <ExternalLink size={16} />
                Telegram botni ochish
              </Button>
              <Button
                onClick={handleBotConnected}
                variant="outline"
                className="w-full h-11 rounded-2xl font-semibold"
                data-testid="button-check-telegram-linked"
              >
                Ulandim, davom etish
              </Button>
              <button
                onClick={() => setShowTelegramRequired(false)}
                className="text-sm text-gray-400 hover:text-gray-600 w-full py-1"
                data-testid="button-cancel-telegram"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
