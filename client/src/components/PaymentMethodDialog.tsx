import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, ExternalLink, ChevronLeft } from "lucide-react";

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCardTransfer: () => void;
}

type TelegramStep = "info" | "code-input";

export default function PaymentMethodDialog({ isOpen, onClose, onSelectCardTransfer }: PaymentMethodDialogProps) {
  const { toast } = useToast();
  const [showTelegramRequired, setShowTelegramRequired] = useState(false);
  const [telegramStep, setTelegramStep] = useState<TelegramStep>("info");
  const [linkCode, setLinkCode] = useState("");

  const { data: telegramStatus, refetch: refetchTelegramStatus } = useQuery<{ linked: boolean; botUrl: string }>({
    queryKey: ['/api/check-telegram-linked'],
    enabled: isOpen,
    staleTime: 30000,
  });

  const linkAccountMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest('/api/telegram/link-account', 'POST', { code });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/check-telegram-linked'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: "Telegram bog'landi!", description: "Endi to'lovni davom ettirishingiz mumkin." });
      setShowTelegramRequired(false);
      setTelegramStep("info");
      setLinkCode("");
      onClose();
      onSelectCardTransfer();
    },
    onError: (error: any) => {
      let msg = "Kod noto'g'ri yoki muddati o'tgan";
      try {
        const raw = error.message || "";
        const idx = raw.indexOf(": ");
        const parsed = JSON.parse(idx >= 0 ? raw.slice(idx + 2) : raw);
        if (parsed?.message) msg = parsed.message;
      } catch {}
      toast({ title: "Xatolik", description: msg, variant: "destructive" });
    },
  });

  const handleCardTransfer = async () => {
    const result = await refetchTelegramStatus();
    const linked = result.data?.linked;
    if (!linked) {
      setTelegramStep("info");
      setLinkCode("");
      setShowTelegramRequired(true);
      return;
    }
    onClose();
    onSelectCardTransfer();
  };

  const handleOpenBot = () => {
    const botUrl = telegramStatus?.botUrl || 'https://t.me/uzfitboom_bot?start=auth';
    window.open(botUrl, '_blank');
    setTelegramStep("code-input");
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode || linkCode.length < 6) {
      toast({ title: "Xatolik", description: "Kodni to'liq kiriting", variant: "destructive" });
      return;
    }
    linkAccountMutation.mutate(linkCode);
  };

  const handleCloseTelegram = () => {
    setShowTelegramRequired(false);
    setTelegramStep("info");
    setLinkCode("");
  };

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
            {/* Active: Kartaga o'tkazish */}
            <button
              onClick={handleCardTransfer}
              data-testid="button-payment-card"
              className="w-full flex items-center gap-4 bg-background border border-border rounded-2xl px-4 py-4 hover:bg-muted/50 active:scale-[0.98] transition-all duration-150 text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#5B5FEF] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-2xl">K</span>
              </div>
              <span className="font-semibold text-base text-foreground">Kartaga o'tkazish</span>
            </button>

            {/* Coming soon section */}
            <div className="pt-2 pb-1">
              <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
                Tez kunda qo'shiladi
              </p>
            </div>

            {/* Disabled: Click */}
            <div
              data-testid="button-payment-click"
              className="w-full flex items-center gap-4 bg-muted/30 border border-border/50 rounded-2xl px-4 py-4 opacity-50 cursor-not-allowed text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#00ADEF]/70 flex items-center justify-center flex-shrink-0">
                <div className="flex items-center gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                  <span className="text-white font-bold text-sm leading-none">click</span>
                </div>
              </div>
              <div className="flex-1">
                <span className="font-semibold text-base text-foreground">Click</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Yaqinda</span>
            </div>

            {/* Disabled: Payme */}
            <div
              data-testid="button-payment-payme"
              className="w-full flex items-center gap-4 bg-muted/30 border border-border/50 rounded-2xl px-4 py-4 opacity-50 cursor-not-allowed text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border flex items-center justify-center flex-shrink-0">
                <div className="flex items-baseline">
                  <span className="font-bold text-gray-900 text-base leading-none">Pay</span>
                  <span className="font-bold text-sm leading-none border-b-2 border-[#1B61F5] text-[#1B61F5]">me</span>
                </div>
              </div>
              <div className="flex-1">
                <span className="font-semibold text-base text-foreground">Payme</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Yaqinda</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram bog'lash dialogi */}
      <Dialog open={showTelegramRequired} onOpenChange={(open) => { if (!open) handleCloseTelegram(); }}>
        <DialogContent className="w-[92vw] max-w-[380px] p-0 rounded-3xl border-none shadow-xl" data-testid="dialog-telegram-required">
          <div className="p-6 space-y-5">

            {/* INFO qadami */}
            {telegramStep === "info" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Send className="text-blue-500" size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Telegram bot kerak</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Kartaga o'tkazish uchun avval <strong>@uzfitboom_bot</strong> ga ulanishingiz kerak.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Botga o'ting, <strong>/start</strong> bosing va bot bergan <strong>maxsus kodni</strong> keyingi qadamda kiriting.
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
                  <button
                    onClick={handleCloseTelegram}
                    className="text-sm text-gray-400 hover:text-gray-600 w-full py-1"
                    data-testid="button-cancel-telegram"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            )}

            {/* KOD KIRITISH qadami */}
            {telegramStep === "code-input" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTelegramStep("info")}
                    className="text-gray-400 hover:text-gray-600"
                    data-testid="button-back-telegram-step"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <h3 className="text-lg font-bold text-gray-900">Botdan kodni kiriting</h3>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
                  <p>Telegram botda <strong>/start</strong> bosib, kelgan <strong>kirish kodini</strong> shu yerga kiriting.</p>
                </div>

                <form onSubmit={handleLinkSubmit} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="XXXXXXXX"
                    value={linkCode}
                    onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                    autoFocus
                    className="text-center text-2xl font-mono tracking-widest h-14 rounded-2xl border-2"
                    maxLength={8}
                    data-testid="input-telegram-link-code"
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-2xl bg-blue-500 hover:bg-blue-600 font-semibold"
                    disabled={linkAccountMutation.isPending}
                    data-testid="button-submit-link-code"
                  >
                    {linkAccountMutation.isPending ? "Tekshirilmoqda..." : "Tasdiqlash va davom etish"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleOpenBot}
                    className="w-full h-9 rounded-2xl text-sm text-blue-600 gap-1"
                    data-testid="button-reopen-bot"
                  >
                    <ExternalLink size={14} />
                    Botni qayta ochish
                  </Button>
                </form>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
