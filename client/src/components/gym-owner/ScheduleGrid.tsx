import { useMemo } from "react";
import { DAY_SHORT_UZ, WEEK_ORDER, toMinutes, toTimeString, findPeakWindow, type HoursRow, type PeakWindowRow } from "@shared/schedule";
import { cn } from "@/lib/utils";

export type CellState = 'closed' | 'peak' | 'open';

interface ScheduleGridProps {
  hours: HoursRow[];
  peakWindows: PeakWindowRow[];
  /** (slotId yoki "day-time") -> band joylar soni. Ixtiyoriy. */
  occupancy?: Map<string, number>;
  capacityByCell?: Map<string, number>;
  /** Katakni bosganda — pik holatini almashtirish */
  onToggleCell?: (dayOfWeek: number, startTime: string, endTime: string) => void;
  /** Kun sarlavhasini bosganda — dam kunini almashtirish */
  onToggleDay?: (dayOfWeek: number) => void;
  readOnly?: boolean;
}

/**
 * Haftalik jadval to'ri — vertikal soatlar, gorizontal kunlar.
 *
 * Zal egasi butun haftasini bir qarashda ko'radi va katakni bosib pik vaqt
 * qilib belgilaydi. Ilgari jadval modal ichidagi tekis ro'yxat edi va
 * umumiy manzarani ko'rib bo'lmasdi.
 */
export default function ScheduleGrid({
  hours,
  peakWindows,
  occupancy,
  capacityByCell,
  onToggleCell,
  onToggleDay,
  readOnly = false,
}: ScheduleGridProps) {
  // To'r faqat zal ochiq bo'lgan eng erta va eng kech vaqt oralig'ini qamraydi
  const { fromHour, toHour } = useMemo(() => {
    const openRows = hours.filter((h) => !h.isClosed);
    if (openRows.length === 0) return { fromHour: 8, toHour: 22 };
    const min = Math.min(...openRows.map((h) => toMinutes(h.openTime)));
    const max = Math.max(...openRows.map((h) => toMinutes(h.closeTime)));
    return {
      fromHour: Math.floor(min / 60),
      toHour: Math.ceil(max / 60),
    };
  }, [hours]);

  const hourRows = useMemo(
    () => Array.from({ length: Math.max(0, toHour - fromHour) }, (_, i) => fromHour + i),
    [fromHour, toHour],
  );

  function cellState(dayOfWeek: number, hour: number): CellState {
    const start = toTimeString(hour * 60);
    const end = toTimeString((hour + 1) * 60);
    const dayRow = hours.find((h) => h.dayOfWeek === dayOfWeek);

    if (!dayRow || dayRow.isClosed) return 'closed';
    if (toMinutes(start) < toMinutes(dayRow.openTime)) return 'closed';
    if (toMinutes(end) > toMinutes(dayRow.closeTime)) return 'closed';

    return findPeakWindow(peakWindows, dayOfWeek, start, end) ? 'peak' : 'open';
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Kun sarlavhalari */}
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1 mb-1">
          <div />
          {WEEK_ORDER.map((dayOfWeek) => {
            const dayRow = hours.find((h) => h.dayOfWeek === dayOfWeek);
            const isClosed = !dayRow || dayRow.isClosed;
            return (
              <button
                key={dayOfWeek}
                type="button"
                disabled={readOnly}
                onClick={() => onToggleDay?.(dayOfWeek)}
                className={cn(
                  "rounded-md py-1.5 text-xs font-semibold transition-colors",
                  isClosed
                    ? "bg-muted text-muted-foreground line-through"
                    : "bg-background text-foreground hover:bg-muted",
                  !readOnly && "cursor-pointer",
                )}
                title={isClosed ? "Dam kuni — ochish uchun bosing" : "Ish kuni — yopish uchun bosing"}
                data-testid={`schedule-day-${dayOfWeek}`}
              >
                {DAY_SHORT_UZ[dayOfWeek]}
              </button>
            );
          })}
        </div>

        {/* Soat qatorlari */}
        <div className="space-y-1">
          {hourRows.map((hour) => (
            <div key={hour} className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1">
              <div className="flex items-center justify-end pr-1 text-[11px] tabular-nums text-muted-foreground">
                {toTimeString(hour * 60)}
              </div>

              {WEEK_ORDER.map((dayOfWeek) => {
                const state = cellState(dayOfWeek, hour);
                const key = `${dayOfWeek}-${toTimeString(hour * 60)}`;
                const booked = occupancy?.get(key);
                const capacity = capacityByCell?.get(key);
                const isInteractive = !readOnly && state !== 'closed';

                return (
                  <button
                    key={dayOfWeek}
                    type="button"
                    disabled={!isInteractive}
                    onClick={() =>
                      onToggleCell?.(dayOfWeek, toTimeString(hour * 60), toTimeString((hour + 1) * 60))
                    }
                    className={cn(
                      "h-8 rounded-md border text-[10px] font-medium tabular-nums transition-colors",
                      state === 'closed' && "border-transparent bg-muted/40 text-muted-foreground/50",
                      state === 'peak' && "border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-400",
                      state === 'open' && "border-border bg-background hover:bg-muted",
                      isInteractive && "cursor-pointer",
                    )}
                    title={
                      state === 'closed'
                        ? 'Zal yopiq'
                        : state === 'peak'
                          ? 'Pik vaqt — FitBoom mijozlari bron qila olmaydi. Bekor qilish uchun bosing.'
                          : 'Ochiq. Pik vaqt qilish uchun bosing.'
                    }
                    data-testid={`schedule-cell-${key}`}
                  >
                    {state === 'open' && booked !== undefined && capacity
                      ? `${booked}/${capacity}`
                      : state === 'peak'
                        ? 'pik'
                        : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Izoh */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-border bg-background" /> Ochiq
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-amber-500/40 bg-amber-500/20" /> Pik — FitBoom yopiq
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-muted/60" /> Zal yopiq
          </span>
        </div>
      </div>
    </div>
  );
}
