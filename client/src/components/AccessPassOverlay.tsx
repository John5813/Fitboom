import { useEffect, useState } from "react";
import { Clock, ShieldCheck, User, X } from "lucide-react";
import Wordmark from "@/components/brand/Wordmark";
import { formatRemaining, passRemainingMs, tashkentClock, type AccessPass } from "@shared/accessPass";

/*
 * Administratorga ko'rsatiladigan jonli ruxsatnoma.
 *
 * "Jonli" bo'lishi muhim: katta soat har soniyada yuradi, chiziq doim
 * harakatda, "Jonli" belgisi miltillaydi. Skrinshot qotib qoladi —
 * administrator uni birdan farqlaydi va boshqa odamga yuborib bo'lmaydi.
 */

export default function AccessPassOverlay({ pass, onClose }: { pass: AccessPass; onClose: () => void }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Administratorga ko'rsatayotganda ekran o'chib qolmasin
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  // Esc bilan yopish, fon aylanmasin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Hamma vaqt Toshkent bo'yicha — bron vaqti va devordagi soat bilan bir xil
  const clock = tashkentClock(now.getTime());
  const checkedIn = tashkentClock(pass.checkedInAt);
  const remaining = passRemainingMs(pass, now.getTime());

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#07080d] text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-pass-title"
      data-testid="access-pass-overlay"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 45% at 50% 18%, rgba(34,197,94,0.28), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(217,167,81,0.18), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-full max-w-sm flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Wordmark className="text-xl" />
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            aria-label="Yopish"
            data-testid="button-access-pass-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tasdiq belgisi: kirishda "otilib" chiqadi, keyin doim to'lqin tarqatadi */}
        <div className="relative mx-auto mt-8 flex h-28 w-28 items-center justify-center">
          <span className="access-pass-ring absolute inset-0 rounded-full border-2 border-green-400/60" aria-hidden />
          <span className="access-pass-ring access-pass-ring-2 absolute inset-0 rounded-full border-2 border-green-400/40" aria-hidden />
          <div className="access-pass-pop flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green-400 via-green-600 to-green-800 shadow-[0_0_60px_rgba(34,197,94,0.45)]">
            <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden>
              <path
                className="access-pass-check"
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27 l8 8 l16 -18"
              />
            </svg>
          </div>
        </div>

        <h1 id="access-pass-title" className="mt-6 text-center font-display text-3xl font-extrabold tracking-tight">
          Kirish tasdiqlandi
        </h1>
        <p className="mt-1 text-center font-display text-xl font-bold text-gold-gradient" data-testid="text-access-pass-gym">
          {pass.gymName}
        </p>

        {/* Jonli soat */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-green-400">
            <span className="access-pass-live h-2 w-2 rounded-full bg-green-400" aria-hidden />
            Jonli ruxsatnoma
          </div>
          <p className="mt-2 font-mono text-5xl font-bold tabular-nums tracking-tight" data-testid="text-access-pass-clock">
            {clock.hms}
          </p>
          <p className="mt-1 text-sm text-white/50">{clock.date}</p>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div className="access-pass-shimmer absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#d9a751] to-transparent" />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <dt className="text-xs text-white/50">Mijoz</dt>
            <dd className="mt-0.5 truncate font-semibold">{pass.userName || "—"}</dd>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <dt className="text-xs text-white/50">Bron vaqti</dt>
            <dd className="mt-0.5 font-semibold">{pass.slot || "—"}</dd>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <dt className="text-xs text-white/50">Kirgan vaqti</dt>
            <dd className="mt-0.5 font-semibold">{checkedIn.hm}</dd>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <dt className="flex items-center gap-1 text-xs text-white/50">
              <Clock className="h-3 w-3" /> Amal qiladi
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-green-400">{formatRemaining(remaining)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#d9a751]/30 bg-[#d9a751]/10 p-3 text-sm">
          <User className="h-5 w-5 shrink-0 text-[#e2b86a]" />
          <p className="text-white/85">Ushbu oynani zal administratoriga ko'rsating</p>
        </div>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/10 font-semibold transition-colors hover:bg-white/15"
            data-testid="button-access-pass-done"
          >
            <ShieldCheck className="h-5 w-5 text-green-400" />
            Yopish
          </button>
          <p className="mt-2 text-center text-xs text-white/40">
            Ruxsatnoma 1 soat davomida ekrandagi yashil tugma orqali qayta ochiladi
          </p>
        </div>
      </div>
    </div>
  );
}
