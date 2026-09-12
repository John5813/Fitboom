import { describe, it, expect } from 'vitest';
import {
  toMinutes, overlaps, dayOfWeekFromDate, isWithinOpeningHours,
  findPeakWindow, resolveSlotAvailability, parseLegacyHours, defaultGymHours,
  type HoursRow, type PeakWindowRow,
} from '../schedule';

const hours: HoursRow[] = [
  { dayOfWeek: 0, openTime: '09:00', closeTime: '22:00', isClosed: true },  // Yakshanba yopiq
  { dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', isClosed: false }, // Dushanba
  { dayOfWeek: 2, openTime: '07:00', closeTime: '23:00', isClosed: false }, // Seshanba
];

describe('dayOfWeekFromDate', () => {
  it('sanani to\'g\'ri hafta kuniga o\'giradi', () => {
    expect(dayOfWeekFromDate('2026-09-14')).toBe(1); // dushanba
    expect(dayOfWeekFromDate('2026-09-13')).toBe(0); // yakshanba
    expect(dayOfWeekFromDate('2026-09-19')).toBe(6); // shanba
  });

  it('ISO datetime bilan ham ishlaydi', () => {
    expect(dayOfWeekFromDate('2026-09-14T00:00:00.000Z')).toBe(1);
  });

  it('vaqt mintaqasidan qat\'i nazar bir xil natija beradi', () => {
    // Mahalliy yarim tunda `new Date(str)` bir kun surilib ketishi mumkin edi
    expect(dayOfWeekFromDate('2026-01-01')).toBe(4);
  });
});

describe('overlaps', () => {
  it('ketma-ket oraliqlar kesishmaydi', () => {
    expect(overlaps('10:00', '11:00', '11:00', '12:00')).toBe(false);
  });
  it('qisman ustma-ust tushish aniqlanadi', () => {
    expect(overlaps('10:00', '11:00', '10:30', '12:00')).toBe(true);
  });
  it('to\'liq ichida bo\'lish aniqlanadi', () => {
    expect(overlaps('18:00', '19:00', '17:00', '21:00')).toBe(true);
  });
});

describe('isWithinOpeningHours', () => {
  it('ish vaqti ichidagi slotni qabul qiladi', () => {
    expect(isWithinOpeningHours(hours, 1, '10:00', '11:00')).toBe(true);
  });
  it('ochilishdan oldingi slotni rad etadi', () => {
    expect(isWithinOpeningHours(hours, 1, '08:00', '09:00')).toBe(false);
  });
  it('yopilishdan keyingi slotni rad etadi', () => {
    expect(isWithinOpeningHours(hours, 1, '22:00', '23:00')).toBe(false);
  });
  it('dam kunini rad etadi', () => {
    expect(isWithinOpeningHours(hours, 0, '10:00', '11:00')).toBe(false);
  });
  it('sozlanmagan kunni rad etadi', () => {
    expect(isWithinOpeningHours(hours, 5, '10:00', '11:00')).toBe(false);
  });
});

describe('findPeakWindow', () => {
  const windows: PeakWindowRow[] = [
    { dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 0 },
    { dayOfWeek: 1, startTime: '19:00', endTime: '20:00', maxCapacity: 5 },
    { dayOfWeek: 2, startTime: '07:00', endTime: '09:00', maxCapacity: 3 },
  ];

  it('mos oynani topadi', () => {
    expect(findPeakWindow(windows, 2, '07:00', '08:00')?.maxCapacity).toBe(3);
  });

  it('kesishmasa undefined qaytaradi', () => {
    expect(findPeakWindow(windows, 1, '10:00', '11:00')).toBeUndefined();
  });

  it('bir nechta oyna kesishsa eng qattig\'ini tanlaydi', () => {
    // 19:00-20:00 ikkala oynaga tushadi; qattiqroq (0) g'olib
    expect(findPeakWindow(windows, 1, '19:00', '20:00')?.maxCapacity).toBe(0);
  });

  it('boshqa kundagi oynani hisobga olmaydi', () => {
    expect(findPeakWindow(windows, 3, '18:00', '19:00')).toBeUndefined();
  });
});

describe('resolveSlotAvailability', () => {
  const base = {
    dayOfWeek: 1, startTime: '10:00', endTime: '11:00',
    capacity: 15, bookedCount: 0, hours, peakWindows: [] as PeakWindowRow[],
  };

  it('oddiy ochiq slot', () => {
    const r = resolveSlotAvailability(base);
    expect(r.state).toBe('open');
    expect(r.availableSpots).toBe(15);
  });

  it('bandlik hisobga olinadi', () => {
    const r = resolveSlotAvailability({ ...base, bookedCount: 12 });
    expect(r.availableSpots).toBe(3);
    expect(r.reason).toBeUndefined();
  });

  it('to\'lgan slot sabab bilan qaytadi', () => {
    const r = resolveSlotAvailability({ ...base, bookedCount: 15 });
    expect(r.availableSpots).toBe(0);
    expect(r.reason).toBe('Bu vaqtda joy qolmagan');
  });

  it('yopiq sana hamma narsadan ustun turadi', () => {
    const r = resolveSlotAvailability({ ...base, isClosedDate: true });
    expect(r.state).toBe('closed');
    expect(r.availableSpots).toBe(0);
  });

  it('ish vaqtidan tashqari slot yopiq', () => {
    const r = resolveSlotAvailability({ ...base, startTime: '23:00', endTime: '23:59' });
    expect(r.state).toBe('closed');
  });

  it('pik oyna (maxCapacity 0) FitBoom mijozlarini bloklaydi', () => {
    const r = resolveSlotAvailability({
      ...base, startTime: '18:00', endTime: '19:00',
      peakWindows: [{ dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 0 }],
    });
    expect(r.state).toBe('peak-blocked');
    expect(r.availableSpots).toBe(0);
    expect(r.effectiveCapacity).toBe(0);
  });

  it('pik oyna (maxCapacity > 0) sig\'imni cheklaydi', () => {
    const r = resolveSlotAvailability({
      ...base, startTime: '18:00', endTime: '19:00', bookedCount: 2,
      peakWindows: [{ dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 5 }],
    });
    expect(r.state).toBe('peak-limited');
    expect(r.effectiveCapacity).toBe(5);
    expect(r.availableSpots).toBe(3);
  });

  it('pik chegarasi slot sig\'imidan oshmaydi', () => {
    const r = resolveSlotAvailability({
      ...base, capacity: 4, startTime: '18:00', endTime: '19:00',
      peakWindows: [{ dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 10 }],
    });
    expect(r.effectiveCapacity).toBe(4);
  });

  it('pik oynadan tashqaridagi slot ta\'sirlanmaydi', () => {
    const r = resolveSlotAvailability({
      ...base, startTime: '10:00', endTime: '11:00',
      peakWindows: [{ dayOfWeek: 1, startTime: '18:00', endTime: '21:00', maxCapacity: 0 }],
    });
    expect(r.state).toBe('open');
    expect(r.availableSpots).toBe(15);
  });
});

describe('parseLegacyHours', () => {
  it('oddiy matnni tahlil qiladi', () => {
    expect(parseLegacyHours('09:00 - 22:00')).toEqual({ openTime: '09:00', closeTime: '22:00' });
  });
  it('24:00 ni 23:59 ga keltiradi', () => {
    expect(parseLegacyHours('00:00 - 24:00')).toEqual({ openTime: '00:00', closeTime: '23:59' });
  });
  it('bir xonali soatni to\'ldiradi', () => {
    expect(parseLegacyHours('7:00 – 9:30')).toEqual({ openTime: '07:00', closeTime: '09:30' });
  });
  it('tahlil qilib bo\'lmasa standart qiymat qaytaradi', () => {
    expect(parseLegacyHours('kecha-kunduz')).toEqual({ openTime: '09:00', closeTime: '22:00' });
    expect(parseLegacyHours(null)).toEqual({ openTime: '09:00', closeTime: '22:00' });
  });
});

describe('defaultGymHours', () => {
  it('7 kun qaytaradi va yakshanbani yopiq qiladi', () => {
    const d = defaultGymHours();
    expect(d).toHaveLength(7);
    expect(d.find((h) => h.dayOfWeek === 0)?.isClosed).toBe(true);
    expect(d.filter((h) => h.isClosed)).toHaveLength(1);
  });
});
