import type { LucideIcon } from "lucide-react";
import { formatCompact, formatNumber } from "@/lib/format";

interface StatTileProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  /** Pul bo'lsa — ixcham yozuv va "so'm" izohi */
  money?: boolean;
  hint?: string;
  tone?: "neutral" | "money" | "warning";
}

/**
 * Statistika katakchasi.
 *
 * Ilgari har bir karta o'z rangli gradientiga ega edi (ko'k/binafsha/yashil/
 * to'q sariq) va ranglar hech narsani anglatmasdi. Katta summalar esa
 * kartaga sig'may "157,50…" bo'lib kesilardi.
 */
export default function StatTile({ label, value, icon: Icon, money, hint, tone = "neutral" }: StatTileProps) {
  const numeric = typeof value === "number";
  const display = numeric ? (money ? formatCompact(value) : formatNumber(value)) : value;
  const fullValue = numeric ? formatNumber(value) + (money ? " so'm" : "") : String(value);

  const toneClass =
    tone === "money" ? "text-green-600 dark:text-green-500"
    : tone === "warning" ? "text-amber-600 dark:text-amber-500"
    : "";

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2 sm:gap-2">
        {Icon && (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted sm:h-7 sm:w-7 sm:rounded-lg">
            <Icon className="h-3 w-3 text-muted-foreground sm:h-3.5 sm:w-3.5" />
          </div>
        )}
        <span className="line-clamp-2 min-w-0 break-words text-[11px] leading-tight text-muted-foreground sm:text-xs">
          {label}
        </span>
      </div>
      {/*
        Qiymat shrifti ekran kengligiga moslashadi. Ilgari u qat'iy `text-2xl`
        edi va tor uch ustunli to'rda "157 500 000 so'm" kabi qiymatlar
        "157,…" bo'lib kesilardi.
      */}
      <p
        className={`truncate text-lg font-bold leading-tight tabular-nums xs:text-xl sm:text-2xl ${toneClass}`}
        title={fullValue}
        data-testid={`stat-${label}`}
      >
        {display}
      </p>
      {(hint || money) && (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">{hint ?? "so'm"}</p>
      )}
    </div>
  );
}
