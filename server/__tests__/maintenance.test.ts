import { describe, it, expect, vi } from 'vitest';
import { isMissed, sweepMissedBookings } from '../maintenance';

describe('isMissed', () => {
  const TODAY = '2026-09-19';
  const NOW = '14:30';

  it("o'tgan kundagi bron o'tkazib yuborilgan", () => {
    expect(isMissed({ date: '2026-09-18', scheduledEndTime: '10:00' }, TODAY, NOW)).toBe(true);
  });

  it('kelajakdagi bron hali o\'tkazib yuborilmagan', () => {
    expect(isMissed({ date: '2026-09-20', scheduledEndTime: '10:00' }, TODAY, NOW)).toBe(false);
  });

  it("bugungi bron tugagach 1 soat imkon beriladi", () => {
    // 13:00 da tugagan -> 14:00 gacha imkon, 14:30 da o'tkazib yuborilgan
    expect(isMissed({ date: TODAY, scheduledEndTime: '13:00' }, TODAY, NOW)).toBe(true);
    // 14:00 da tugagan -> 15:00 gacha imkon, 14:30 da hali emas
    expect(isMissed({ date: TODAY, scheduledEndTime: '14:00' }, TODAY, NOW)).toBe(false);
  });

  it('ISO datetime formatdagi sana bilan ham ishlaydi', () => {
    expect(isMissed({ date: '2026-09-18T00:00:00.000Z', scheduledEndTime: '10:00' }, TODAY, NOW)).toBe(true);
  });

  it("sanasi yoki vaqti yo'q bronga tegmaydi", () => {
    expect(isMissed({ date: null, scheduledEndTime: '10:00' }, TODAY, NOW)).toBe(false);
    expect(isMissed({ date: TODAY, scheduledEndTime: null }, TODAY, NOW)).toBe(false);
  });
});

describe('sweepMissedBookings', () => {
  function makeStorage(bookings: any[]) {
    return {
      getBookings: vi.fn().mockResolvedValue(bookings),
      updateBookingStatus: vi.fn().mockResolvedValue(undefined),
      releaseSlotOnDate: vi.fn().mockResolvedValue(undefined),
    } as any;
  }

  const past = '2020-01-01';

  it("o'tgan bronni belgilaydi va joyni bo'shatadi", async () => {
    const storage = makeStorage([
      { id: 'b1', date: past, scheduledEndTime: '10:00', timeSlotId: 'slot-1', status: 'pending', isCompleted: false },
    ]);

    const result = await sweepMissedBookings(storage);

    expect(result.markedMissed).toBe(1);
    expect(result.slotsReleased).toBe(1);
    expect(storage.updateBookingStatus).toHaveBeenCalledWith('b1', 'missed');
    // Eski xato: joy bo'shatilmasdi va sig'im abadiy band bo'lib qolardi
    expect(storage.releaseSlotOnDate).toHaveBeenCalledWith('slot-1', past);
  });

  it('allaqachon yakunlangan yoki bekor qilingan bronga tegmaydi', async () => {
    const storage = makeStorage([
      { id: 'b1', date: past, scheduledEndTime: '10:00', timeSlotId: 's1', status: 'completed', isCompleted: true },
      { id: 'b2', date: past, scheduledEndTime: '10:00', timeSlotId: 's2', status: 'cancelled', isCompleted: false },
      { id: 'b3', date: past, scheduledEndTime: '10:00', timeSlotId: 's3', status: 'missed', isCompleted: false },
    ]);

    const result = await sweepMissedBookings(storage);

    expect(result.markedMissed).toBe(0);
    expect(storage.updateBookingStatus).not.toHaveBeenCalled();
    expect(storage.releaseSlotOnDate).not.toHaveBeenCalled();
  });

  it('kelajakdagi bronga tegmaydi', async () => {
    const storage = makeStorage([
      { id: 'b1', date: '2099-01-01', scheduledEndTime: '10:00', timeSlotId: 's1', status: 'pending', isCompleted: false },
    ]);
    const result = await sweepMissedBookings(storage);
    expect(result.markedMissed).toBe(0);
  });

  it('idempotent: ikkinchi chaqiruv hech narsa qilmaydi', async () => {
    const booking = { id: 'b1', date: past, scheduledEndTime: '10:00', timeSlotId: 's1', status: 'pending', isCompleted: false };
    const storage = makeStorage([booking]);

    await sweepMissedBookings(storage);
    // Birinchi chaqiruvdan keyin status o'zgargan holatni taqlid qilamiz
    booking.status = 'missed';
    const second = await sweepMissedBookings(storage);

    expect(second.markedMissed).toBe(0);
    expect(storage.releaseSlotOnDate).toHaveBeenCalledTimes(1);
  });

  it("slotsiz bron belgilanadi, lekin bo'shatish chaqirilmaydi", async () => {
    const storage = makeStorage([
      { id: 'b1', date: past, scheduledEndTime: '10:00', timeSlotId: null, status: 'pending', isCompleted: false },
    ]);
    const result = await sweepMissedBookings(storage);
    expect(result.markedMissed).toBe(1);
    expect(result.slotsReleased).toBe(0);
  });
});
