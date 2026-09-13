import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Panellararo mantiqiy bog'lanish testi.
 *
 * Uch panel bitta ma'lumotga tayanadi:
 *   zal egasi jadvalni belgilaydi -> mijoz shu qoidalar ostida bron qiladi
 *   admin kreditni o'zgartiradi   -> mijoz balansi o'zgaradi
 *
 * Bu test o'sha bog'lanish uzilib qolmaganini tekshiradi: qoidalar haqiqatan
 * bron qilishni to'xtatadimi yoki faqat UI da ko'rinadimi.
 */

const storage = {
  getGymHours: vi.fn(),
  getGymPeakWindows: vi.fn(),
  getGymClosures: vi.fn(),
  getTimeSlots: vi.fn(),
  getSlotOccupancy: vi.fn(),
};

vi.mock('../storage', () => ({ storage }));

const { checkBookingAllowed, buildAvailability } = await import('../scheduleRoutes');

const GYM = 'gym-1';
// 2026-09-14 — dushanba
const MONDAY = '2026-09-14';
const TUESDAY = '2026-09-15';

const slot = (startTime: string, endTime: string, day = 'Dushanba') => ({
  id: `slot-${startTime}`, gymId: GYM, dayOfWeek: day,
  startTime, endTime, capacity: 15, availableSpots: 15,
});

beforeEach(() => {
  storage.getGymHours.mockResolvedValue(
    [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      dayOfWeek: d, openTime: '07:00', closeTime: '22:00', isClosed: d === 0,
    })),
  );
  storage.getGymPeakWindows.mockResolvedValue([]);
  storage.getGymClosures.mockResolvedValue([]);
  storage.getTimeSlots.mockResolvedValue([slot('09:00', '10:00'), slot('18:00', '19:00')]);
  storage.getSlotOccupancy.mockResolvedValue(new Map());
});

describe('zal egasi -> mijoz: pik vaqt', () => {
  it('pik oyna belgilangach mijoz o\'sha vaqtga bron qila olmaydi', async () => {
    storage.getGymPeakWindows.mockResolvedValue([
      { dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 0 },
    ]);

    const result = await checkBookingAllowed({
      gymId: GYM, date: MONDAY, slot: slot('18:00', '19:00'),
    });

    expect(result.ok).toBe(false);
    expect(result.effectiveCapacity).toBe(0);
    expect(result.message).toContain('band vaqti');
  });

  it('pik oynadan tashqaridagi vaqt ochiq qoladi', async () => {
    storage.getGymPeakWindows.mockResolvedValue([
      { dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 0 },
    ]);
    const result = await checkBookingAllowed({
      gymId: GYM, date: MONDAY, slot: slot('09:00', '10:00'),
    });
    expect(result.ok).toBe(true);
    expect(result.effectiveCapacity).toBe(15);
  });

  it('cheklangan pik oyna sig\'imni kamaytiradi, lekin yopmaydi', async () => {
    storage.getGymPeakWindows.mockResolvedValue([
      { dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 4 },
    ]);
    const result = await checkBookingAllowed({
      gymId: GYM, date: MONDAY, slot: slot('18:00', '19:00'),
    });
    expect(result.ok).toBe(true);
    expect(result.effectiveCapacity).toBe(4);
  });
});

describe('zal egasi -> mijoz: ish vaqti va yopiq kunlar', () => {
  it('dam kuni bron qilishni to\'xtatadi', async () => {
    // 2026-09-13 — yakshanba, jadvalda yopiq
    const result = await checkBookingAllowed({
      gymId: GYM, date: '2026-09-13', slot: slot('09:00', '10:00', 'Yakshanba'),
    });
    expect(result.ok).toBe(false);
  });

  it('ish vaqtidan tashqari slot rad etiladi', async () => {
    const result = await checkBookingAllowed({
      gymId: GYM, date: MONDAY, slot: slot('06:00', '07:00'),
    });
    expect(result.ok).toBe(false);
  });

  it('aniq sanadagi yopilish (bayram) faqat o\'sha kunga ta\'sir qiladi', async () => {
    storage.getGymClosures.mockResolvedValue([{ date: MONDAY, reason: 'Bayram' }]);

    const blocked = await checkBookingAllowed({ gymId: GYM, date: MONDAY, slot: slot('09:00', '10:00') });
    expect(blocked.ok).toBe(false);

    // Keyingi dushanba ochiq qolishi kerak
    const nextMonday = '2026-09-21';
    const open = await checkBookingAllowed({ gymId: GYM, date: nextMonday, slot: slot('09:00', '10:00') });
    expect(open.ok).toBe(true);
  });
});

describe('slot va sana mosligi', () => {
  it('boshqa kunning slotini bu sanaga bron qilib bo\'lmaydi', async () => {
    // Dushanba sloti seshanba sanasiga
    const result = await checkBookingAllowed({
      gymId: GYM, date: TUESDAY, slot: slot('09:00', '10:00', 'Dushanba'),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Dushanba');
  });
});

describe('mijoz ko\'radigan bandlik sanaga bog\'liq', () => {
  it('bir sanadagi bandlik boshqa sanaga ta\'sir qilmaydi', async () => {
    storage.getSlotOccupancy.mockImplementation(async (_ids: string[], date: string) =>
      date === MONDAY ? new Map([['slot-09:00', 15]]) : new Map());

    const monday = await buildAvailability(GYM, MONDAY);
    const nextMonday = await buildAvailability(GYM, '2026-09-21');

    const mondaySlot = monday.find((s) => s.startTime === '09:00')!;
    const nextSlot = nextMonday.find((s) => s.startTime === '09:00')!;

    expect(mondaySlot.availableSpots).toBe(0);
    expect(mondaySlot.isAvailable).toBe(false);
    // Eski modelda bu ham 0 bo'lib qolardi — slot "abadiy to'lgan" edi
    expect(nextSlot.availableSpots).toBe(15);
    expect(nextSlot.isAvailable).toBe(true);
  });

  it('pik oyna mijoz ko\'radigan ro\'yxatda ham bloklangan holatda chiqadi', async () => {
    storage.getGymPeakWindows.mockResolvedValue([
      { dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 0 },
    ]);
    const slots = await buildAvailability(GYM, MONDAY);
    const peak = slots.find((s) => s.startTime === '18:00')!;

    expect(peak.state).toBe('peak-blocked');
    expect(peak.isAvailable).toBe(false);
    expect(peak.reason).toBeTruthy();
  });
});
