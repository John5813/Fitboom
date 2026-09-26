/**
 * Jadval mantig'i — client va serverda bir xil ishlatiladi.
 *
 * Uchta alohida tushuncha bor va ular aralashtirilmasligi kerak:
 *   1. Ish vaqti   (gym_hours)       — zal qachon ochiq
 *   2. Istisnolar  (gym_closures)    — aniq sanada yopiq
 *   3. Pik oynalar (gym_peak_windows) — zal ochiq, lekin FitBoom mijozlariga
 *                                        yopiq yoki cheklangan
 */

export const DAY_NAMES_UZ = [
  'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba',
] as const;

export const DAY_SHORT_UZ = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'] as const;

/** Hafta boshi dushanbadan bo'lishi uchun ko'rsatish tartibi */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES_UZ[dayOfWeek] ?? String(dayOfWeek);
}

export function dayNumberFromName(name: string): number | undefined {
  const idx = DAY_NAMES_UZ.indexOf(name as typeof DAY_NAMES_UZ[number]);
  return idx === -1 ? undefined : idx;
}

/** "HH:MM" -> yarim tundan boshlab minutlar */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** minutlar -> "HH:MM" */
export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * "YYYY-MM-DD" sanadan hafta kunini oladi (0 = Yakshanba).
 * `new Date(str)` vaqt mintaqasiga qarab bir kun surilishi mumkin, shuning
 * uchun sana komponentlaridan UTC orqali hisoblaymiz.
 */
export function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export interface HoursRow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface PeakWindowRow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

/** Ikkita vaqt oralig'i kesishadimi (chegaralar ochiq: 10:00-11:00 va 11:00-12:00 kesishmaydi) */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/** Berilgan oraliq zalning ish vaqti ichidami */
export function isWithinOpeningHours(
  hours: HoursRow[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): boolean {
  const row = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!row || row.isClosed) return false;
  return toMinutes(startTime) >= toMinutes(row.openTime)
    && toMinutes(endTime) <= toMinutes(row.closeTime);
}

/**
 * Oraliqqa tegishli pik oynani topadi.
 * Bir nechta oyna kesishsa, eng qattig'i (eng kichik maxCapacity) qaytariladi.
 */
export function findPeakWindow(
  windows: PeakWindowRow[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): PeakWindowRow | undefined {
  const matching = windows.filter(
    (w) => w.dayOfWeek === dayOfWeek && overlaps(startTime, endTime, w.startTime, w.endTime),
  );
  if (matching.length === 0) return undefined;
  return matching.reduce((strictest, w) => (w.maxCapacity < strictest.maxCapacity ? w : strictest));
}

export type SlotState = 'closed' | 'peak-blocked' | 'peak-limited' | 'open';

export interface SlotAvailability {
  state: SlotState;
  /** Shu sanada FitBoom mijozlari uchun haqiqiy chegara */
  effectiveCapacity: number;
  /** Qolgan bo'sh joy */
  availableSpots: number;
  /** Foydalanuvchiga ko'rsatiladigan sabab (bo'sh bo'lsa — hammasi joyida) */
  reason?: string;
}

/**
 * Bitta slotning aniq sanadagi holatini hisoblaydi — barcha qoidalarni
 * bitta joyda birlashtiradi. Web, mobil API va zal egasi paneli shu funksiyadan
 * foydalanadi, shuning uchun qoidalar hamma joyda bir xil ishlaydi.
 */
export function resolveSlotAvailability(params: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  hours: HoursRow[];
  peakWindows: PeakWindowRow[];
  isClosedDate?: boolean;
}): SlotAvailability {
  const { dayOfWeek, startTime, endTime, capacity, bookedCount, hours, peakWindows, isClosedDate } = params;

  if (isClosedDate) {
    return { state: 'closed', effectiveCapacity: 0, availableSpots: 0, reason: 'Bu kuni zal yopiq' };
  }

  if (!isWithinOpeningHours(hours, dayOfWeek, startTime, endTime)) {
    return { state: 'closed', effectiveCapacity: 0, availableSpots: 0, reason: 'Zalning ish vaqtidan tashqari' };
  }

  const peak = findPeakWindow(peakWindows, dayOfWeek, startTime, endTime);
  if (peak) {
    if (peak.maxCapacity === 0) {
      return {
        state: 'peak-blocked',
        effectiveCapacity: 0,
        availableSpots: 0,
        reason: 'Bu vaqt zalning band vaqti — boshqa vaqtni tanlang',
      };
    }
    const effectiveCapacity = Math.min(capacity, peak.maxCapacity);
    return {
      state: 'peak-limited',
      effectiveCapacity,
      availableSpots: Math.max(0, effectiveCapacity - bookedCount),
      reason: bookedCount >= effectiveCapacity ? 'Bu vaqtda joy qolmagan' : undefined,
    };
  }

  return {
    state: 'open',
    effectiveCapacity: capacity,
    availableSpots: Math.max(0, capacity - bookedCount),
    reason: bookedCount >= capacity ? 'Bu vaqtda joy qolmagan' : undefined,
  };
}

/** Yangi zal uchun standart ish vaqti: har kuni 09:00-22:00, yakshanba yopiq */
export function defaultGymHours(): HoursRow[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    openTime: '09:00',
    closeTime: '22:00',
    isClosed: dayOfWeek === 0,
  }));
}

/**
 * Eski `gyms.hours` matnini ("09:00 - 22:00") tarkibiy shaklga o'giradi.
 * Tahlil qilib bo'lmasa, standart qiymat qaytariladi.
 */
export function parseLegacyHours(hoursText: string | null | undefined): { openTime: string; closeTime: string } {
  const match = (hoursText || '').match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return { openTime: '09:00', closeTime: '22:00' };
  const [, h1, m1, h2, m2] = match;
  const open = `${h1.padStart(2, '0')}:${m1}`;
  // "24:00" haqiqiy vaqt emas — 23:59 ga keltiriladi
  const close = h2 === '24' ? '23:59' : `${h2.padStart(2, '0')}:${m2}`;
  return { openTime: open, closeTime: close };
}
