import { cn } from "@/lib/utils";

/**
 * FitBoom yozuvi — logotipdagi kabi "Fit" oq, "Boom" oltin.
 *
 * Rasm emas, matn: har qanday o'lchamda tiniq, og'irligi nol. Ilgari bu
 * joylarda Replit avtomatik yaratgan olovli rasm (~800 KB) turardi.
 */
export default function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-display font-extrabold italic tracking-tight select-none", className)}
      aria-label="FitBoom"
    >
      <span className="text-white">Fit</span>
      <span className="text-gold-gradient">Boom</span>
    </span>
  );
}
