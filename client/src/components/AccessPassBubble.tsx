import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { formatRemainingShort, passRemainingMs, type AccessPass } from "@shared/accessPass";

/**
 * Ruxsatnoma yopilgandan keyin 1 soat davomida ekran burchagida turadi.
 * Pastki menyudan yuqorida — uni to'sib qo'ymaydi.
 */
export default function AccessPassBubble({ pass, onOpen }: { pass: AccessPass; onOpen: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="access-pass-bubble fixed right-4 z-[90] flex items-center gap-2 rounded-full bg-green-600 py-2 pl-2 pr-4 text-white shadow-lg shadow-green-900/30 transition-transform active:scale-95"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      aria-label={`${pass.gymName} — kirish ruxsatnomasini ochish`}
      data-testid="button-access-pass-bubble"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs font-bold">Kirish ruxsati</span>
        <span className="text-[11px] text-white/80">{formatRemainingShort(passRemainingMs(pass, now))}</span>
      </span>
    </button>
  );
}
