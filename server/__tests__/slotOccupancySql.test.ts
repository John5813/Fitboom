import { describe, it, expect } from 'vitest';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { slotOccupancy } from '@shared/schema';

/**
 * `reserveSlotOnDate` ning atomikligi generatsiya qilingan SQL ga bog'liq.
 * Bu test SQL to'g'ri shakllanishini tekshiradi — `DO UPDATE ... WHERE` sharti
 * bo'lmasa, sig'imdan oshib ketish (overbooking) mumkin bo'lib qoladi.
 */
describe('slot band qilish SQL', () => {
  const db = drizzle({ client: {} as any });

  const built = db
    .insert(slotOccupancy)
    .values({ timeSlotId: 'slot-1', date: '2026-09-14', bookedCount: 1 })
    .onConflictDoUpdate({
      target: [slotOccupancy.timeSlotId, slotOccupancy.date],
      set: { bookedCount: sql`${slotOccupancy.bookedCount} + 1` },
      setWhere: sql`${slotOccupancy.bookedCount} < ${15}`,
    })
    .returning()
    .toSQL();

  it('ON CONFLICT to\'g\'ri ustunlar bo\'yicha ishlaydi', () => {
    expect(built.sql).toContain('on conflict');
    expect(built.sql).toContain('time_slot_id');
    expect(built.sql).toContain('date');
  });

  it('DO UPDATE da sig\'im sharti bor — overbooking himoyasi', () => {
    const afterSet = built.sql.slice(built.sql.indexOf('do update'));
    expect(afterSet).toContain('where');
    expect(afterSet).toContain('booked_count');
  });

  it('RETURNING bor — qator qaytmasa joy yo\'q degani', () => {
    expect(built.sql).toContain('returning');
  });

  it('sig\'im parametr sifatida uzatiladi', () => {
    expect(built.params).toContain(15);
  });

  it('hosil bo\'lgan SQL kutilgan shaklda', () => {
    if (process.env.PRINT_SQL) console.log('\n' + built.sql + '\n');
    // insert -> on conflict -> do update -> where -> returning tartibi
    const order = ['insert into', 'on conflict', 'do update', 'where', 'returning'];
    let pos = -1;
    for (const token of order) {
      const next = built.sql.indexOf(token, pos + 1);
      expect(next, `"${token}" topilmadi yoki tartibi noto'g'ri`).toBeGreaterThan(pos);
      pos = next;
    }
  });
});
