import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCardTransfer: () => void;
}

export default function PaymentMethodDialog({ isOpen, onClose, onSelectCardTransfer }: PaymentMethodDialogProps) {
  const { toast } = useToast();

  const handleClick = () => {
    toast({ title: "Tez kunda", description: "Click orqali to'lov tez orada qo'shiladi" });
    onClose();
  };

  const handlePayme = () => {
    toast({ title: "Tez kunda", description: "Payme orqali to'lov tez orada qo'shiladi" });
    onClose();
  };

  const handleCardTransfer = () => {
    onClose();
    onSelectCardTransfer();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
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
  );
}
