import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  /** Orqaga qaytish manzili */
  backHref: string;
  onBack?: () => void;
  /** O'ng tomondagi asosiy amal */
  action?: ReactNode;
}

/**
 * Admin sahifalari uchun yagona sarlavha.
 *
 * Ilgari har bir sahifa o'z sarlavhasini yozardi: turli gradientlar, orqaga
 * tugmasi goh chapda goh o'ngda, tugmalar mobil uchun juda kichik (28px).
 */
export default function AdminHeader({ title, subtitle, backHref, onBack, action }: AdminHeaderProps) {
  return (
    <header className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(217,167,81,0.30) 0%, transparent 65%)",
        }}
      />
      <div className="relative mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        {/* Orqaga — har doim chapda, barmoq uchun yetarli o'lchamda (40px) */}
        <Link href={backHref}>
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-amber-100/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Orqaga"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-display font-bold sm:text-xl">{title}</h1>
          {subtitle && <p className="truncate text-xs text-amber-100/70 sm:text-sm">{subtitle}</p>}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

/**
 * Sarlavha ostiga "suzib chiqadigan" kontent uchun o'ram.
 *
 * `-mt-*` bilan tepaga tortilgan blok sarlavha ostida ko'rinmay qolardi:
 * sarlavha `relative` bo'lgani uchun u chizish tartibida g'olib chiqardi.
 * `relative z-10` buni tuzatadi.
 */
export function AdminOverlapSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative z-10 mx-auto max-w-5xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
