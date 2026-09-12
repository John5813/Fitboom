/**
 * Zal jadvali API'si — ish vaqti, yopiq sanalar, pik oynalar va bandlik.
 *
 * Bu endpointlar `routes.ts` dan alohida turadi, chunki jadval mantig'i
 * o'zicha yaxlit bo'lim va uni alohida sinash osonroq.
 */
import type { Express } from 'express';
import { storage } from './storage';
import { saveGymScheduleSchema, insertGymClosureSchema } from '@shared/schema';
import {
  resolveSlotAvailability,
  dayOfWeekFromDate,
  dayNumberFromName,
  dayName,
  defaultGymHours,
  toMinutes,
  type HoursRow,
  type PeakWindowRow,
} from '@shared/schedule';

/** Zal jadvalini to'liq o'qish — ish vaqti sozlanmagan bo'lsa standart qiymat */
export async function loadGymSchedule(gymId: string): Promise<{
  hours: HoursRow[];
  peakWindows: PeakWindowRow[];
  closureDates: Set<string>;
}> {
  const [hoursRows, peakRows, closures] = await Promise.all([
    storage.getGymHours(gymId),
    storage.getGymPeakWindows(gymId),
    storage.getGymClosures(gymId),
  ]);

  const hours: HoursRow[] = hoursRows.length > 0
    ? hoursRows.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      }))
    : defaultGymHours();

  return {
    hours,
    peakWindows: peakRows.map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startTime: w.startTime,
      endTime: w.endTime,
      maxCapacity: w.maxCapacity,
    })),
    closureDates: new Set(closures.map((c) => c.date)),
  };
}

export interface BookingRuleResult {
  ok: boolean;
  /** Foydalanuvchiga ko'rsatiladigan xabar */
  message?: string;
  /** Shu sanada slot uchun haqiqiy sig'im (band qilishda ishlatiladi) */
  effectiveCapacity: number;
}

/**
 * Bronni barcha jadval qoidalari bo'yicha tekshiradi.
 *
 * Web (`/api/book-gym`) va mobil (`/api/mobile/v1/bookings`) ikkalasi ham shu
 * funksiyani chaqiradi, shuning uchun qoidalar ikkala kanalda bir xil ishlaydi.
 */
export async function checkBookingAllowed(params: {
  gymId: string;
  date: string;
  slot: { id: string; dayOfWeek: string; startTime: string; endTime: string; capacity: number };
}): Promise<BookingRuleResult> {
  const { gymId, date, slot } = params;
  const dateOnly = date.split('T')[0];
  const weekday = dayOfWeekFromDate(dateOnly);

  // Slotning hafta kuni tanlangan sanaga mos kelishi shart.
  // Ilgari bu tekshirilmasdi — "Dushanba" slotini jumaga bron qilish mumkin edi.
  const slotDay = dayNumberFromName(slot.dayOfWeek);
  if (slotDay === undefined || slotDay !== weekday) {
    return {
      ok: false,
      effectiveCapacity: 0,
      message: `Bu slot ${slot.dayOfWeek} kuniga tegishli, tanlangan sana esa ${dayName(weekday)}.`,
    };
  }

  const { hours, peakWindows, closureDates } = await loadGymSchedule(gymId);

  const availability = resolveSlotAvailability({
    dayOfWeek: weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    bookedCount: 0, // haqiqiy bandlik atomik band qilishda tekshiriladi
    hours,
    peakWindows,
    isClosedDate: closureDates.has(dateOnly),
  });

  if (availability.effectiveCapacity <= 0) {
    return {
      ok: false,
      effectiveCapacity: 0,
      message: availability.reason || "Bu vaqtda bron qilib bo'lmaydi",
    };
  }

  return { ok: true, effectiveCapacity: availability.effectiveCapacity };
}

export function registerScheduleRoutes(
  app: Express,
  deps: {
    requireAuth: any;
    requireAdmin: any;
    requireGymManager: (gymIdFrom: (req: any) => any) => any;
  },
) {
  const { requireAuth, requireGymManager } = deps;
  const gymIdFromParam = (req: any) => req.params.gymId as string;

  /**
   * GET /api/gyms/:gymId/schedule
   * Ochiq — mijoz ilovasi ham zal ish vaqtini ko'rsatishi kerak.
   */
  app.get('/api/gyms/:gymId/schedule', async (req, res) => {
    try {
      const gym = await storage.getGym(req.params.gymId);
      if (!gym) return res.status(404).json({ error: 'Zal topilmadi' });

      const [{ hours, peakWindows }, closures] = await Promise.all([
        loadGymSchedule(req.params.gymId),
        storage.getGymClosures(req.params.gymId),
      ]);

      res.json({ hours, peakWindows, closures });
    } catch (error: any) {
      console.error('[Schedule] Jadvalni olishda xatolik:', error);
      res.status(500).json({ error: 'Jadvalni olishda xatolik' });
    }
  });

  /**
   * PUT /api/gyms/:gymId/schedule
   * Ish vaqti va pik oynalarni bitta so'rovda saqlaydi (zal egasi yoki admin).
   *
   * Yangi pik oyna faqat kelgusi bronlarga ta'sir qiladi — mavjud bronlar
   * bekor qilinmaydi, lekin javobda ta'sirlangan bronlar soni qaytariladi,
   * panel esa buni ogohlantirish sifatida ko'rsatadi.
   */
  app.put('/api/gyms/:gymId/schedule', requireGymManager(gymIdFromParam), async (req, res) => {
    try {
      const gymId = req.params.gymId;
      const gym = await storage.getGym(gymId);
      if (!gym) return res.status(404).json({ error: 'Zal topilmadi' });

      const parsed = saveGymScheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Ma'lumot noto'g'ri" });
      }
      const { hours, peakWindows } = parsed.data;

      await storage.setGymHours(gymId, hours);
      await storage.setGymPeakWindows(gymId, peakWindows);

      // Eski `gyms.hours` matni va `closed_days` ustunini moslashtirib qo'yamiz —
      // ular hali ham zal kartochkasida ko'rsatiladi.
      const closedDays = hours.filter((h) => h.isClosed).map((h) => String(h.dayOfWeek));
      const openDay = hours.find((h) => !h.isClosed);
      await storage.updateGym(gymId, {
        closedDays,
        ...(openDay ? { hours: `${openDay.openTime} - ${openDay.closeTime}` } : {}),
      } as any);

      const affected = await countAffectedBookings(gymId, peakWindows);

      res.json({
        success: true,
        hours,
        peakWindows,
        affectedBookings: affected,
      });
    } catch (error: any) {
      console.error('[Schedule] Jadvalni saqlashda xatolik:', error);
      res.status(500).json({ error: 'Jadvalni saqlashda xatolik' });
    }
  });

  /** POST /api/gyms/:gymId/closures — aniq sanani yopish */
  app.post('/api/gyms/:gymId/closures', requireGymManager(gymIdFromParam), async (req, res) => {
    try {
      const parsed = insertGymClosureSchema.safeParse({ ...req.body, gymId: req.params.gymId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Sana noto'g'ri" });
      }
      const closure = await storage.addGymClosure(parsed.data);
      res.json({ closure });
    } catch (error: any) {
      console.error('[Schedule] Yopiq sana qo\'shishda xatolik:', error);
      res.status(500).json({ error: "Yopiq sana qo'shishda xatolik" });
    }
  });

  /** DELETE /api/gyms/:gymId/closures/:date — yopiq sanani olib tashlash */
  app.delete('/api/gyms/:gymId/closures/:date', requireGymManager(gymIdFromParam), async (req, res) => {
    try {
      const ok = await storage.deleteGymClosure(req.params.gymId, req.params.date);
      if (!ok) return res.status(404).json({ error: 'Bunday yopiq sana topilmadi' });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Yopiq sanani o'chirishda xatolik" });
    }
  });

  /**
   * GET /api/gyms/:gymId/availability?date=YYYY-MM-DD
   * Aniq sanadagi slotlar va ularning haqiqiy holati.
   */
  app.get('/api/gyms/:gymId/availability', async (req, res) => {
    try {
      const gymId = req.params.gymId;
      const date = (req.query.date as string || '').split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date parametri YYYY-MM-DD formatida bo\'lishi kerak' });
      }

      const gym = await storage.getGym(gymId);
      if (!gym) return res.status(404).json({ error: 'Zal topilmadi' });

      const slots = await buildAvailability(gymId, date);
      res.json({ date, dayOfWeek: dayOfWeekFromDate(date), slots });
    } catch (error: any) {
      console.error('[Schedule] Bandlikni olishda xatolik:', error);
      res.status(500).json({ error: 'Bandlikni olishda xatolik' });
    }
  });

  /**
   * GET /api/gyms/:gymId/occupancy?from=&to=
   * Zal egasi paneli uchun: haftalik to'r + har bir katakning bandligi.
   */
  app.get('/api/gyms/:gymId/occupancy', requireGymManager(gymIdFromParam), async (req, res) => {
    try {
      const gymId = req.params.gymId;
      const from = (req.query.from as string || '').split('T')[0];
      const to = (req.query.to as string || '').split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'from va to YYYY-MM-DD formatida bo\'lishi kerak' });
      }

      const rows = await storage.getOccupancyForRange(gymId, from, to);
      res.json({ from, to, occupancy: rows });
    } catch (error: any) {
      res.status(500).json({ error: 'Bandlikni olishda xatolik' });
    }
  });
}

/** Berilgan sanadagi barcha slotlarni holati bilan qaytaradi */
export async function buildAvailability(gymId: string, date: string) {
  const dateOnly = date.split('T')[0];
  const weekday = dayOfWeekFromDate(dateOnly);
  const weekdayName = dayName(weekday);

  const [allSlots, schedule] = await Promise.all([
    storage.getTimeSlots(gymId),
    loadGymSchedule(gymId),
  ]);

  const daySlots = allSlots
    .filter((s) => s.dayOfWeek === weekdayName)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const occupancy = await storage.getSlotOccupancy(daySlots.map((s) => s.id), dateOnly);

  return daySlots.map((slot) => {
    const bookedCount = occupancy.get(slot.id) ?? 0;
    const availability = resolveSlotAvailability({
      dayOfWeek: weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      bookedCount,
      hours: schedule.hours,
      peakWindows: schedule.peakWindows,
      isClosedDate: schedule.closureDates.has(dateOnly),
    });

    return {
      id: slot.id,
      gymId: slot.gymId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      bookedCount,
      // Mijoz ilovalari `availableSpots` ni kutadi — endi u SANAGA bog'liq
      availableSpots: availability.availableSpots,
      effectiveCapacity: availability.effectiveCapacity,
      state: availability.state,
      isAvailable: availability.availableSpots > 0,
      reason: availability.reason,
    };
  });
}

/**
 * Yangi pik oynalar qancha MAVJUD bronga tegishini sanaydi.
 * Bu bronlar bekor qilinmaydi — zal egasiga shunchaki ko'rsatiladi.
 */
async function countAffectedBookings(gymId: string, peakWindows: PeakWindowRow[]): Promise<number> {
  if (peakWindows.length === 0) return 0;

  const bookings = await storage.getBookings();
  const todayIso = new Date().toISOString().split('T')[0];

  return bookings.filter((b) => {
    if (b.gymId !== gymId) return false;
    if (b.status === 'cancelled' || b.status === 'missed' || b.isCompleted) return false;
    const dateOnly = (b.date || '').split('T')[0];
    if (!dateOnly || dateOnly < todayIso) return false;

    const start = b.scheduledStartTime || b.time;
    const end = b.scheduledEndTime || start;
    if (!start) return false;

    const weekday = dayOfWeekFromDate(dateOnly);
    return peakWindows.some(
      (w) => w.dayOfWeek === weekday
        && w.maxCapacity === 0
        && toMinutes(start) < toMinutes(w.endTime)
        && toMinutes(w.startTime) < toMinutes(end || start),
    );
  }).length;
}
