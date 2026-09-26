import { describe, it, expect } from 'vitest';
import {
  ACCESS_PASS_TTL_MS, buildAccessPass, formatRemaining, formatRemainingShort,
  isPassActive, parseStoredPass, passRemainingMs, type AccessPass,
} from '../accessPass';

const T0 = Date.UTC(2026, 8, 26, 13, 0, 0);
const pass: AccessPass = { bookingId: 'b1', gymId: 'g1', gymName: 'Olimp', checkedInAt: T0 };

describe('kirish ruxsatnomasi', () => {
  it('1 soat davomida faol, keyin tugaydi', () => {
    expect(isPassActive(pass, T0)).toBe(true);
    expect(isPassActive(pass, T0 + ACCESS_PASS_TTL_MS - 1)).toBe(true);
    expect(isPassActive(pass, T0 + ACCESS_PASS_TTL_MS)).toBe(false);
  });

  it('qolgan vaqt manfiy bo\'lmaydi', () => {
    expect(passRemainingMs(pass, T0 + 2 * ACCESS_PASS_TTL_MS)).toBe(0);
  });

  it('kelajak vaqtli (soat buzilgan) ruxsatnoma faol emas', () => {
    expect(isPassActive({ ...pass, checkedInAt: T0 + 10 * 60_000 }, T0)).toBe(false);
  });

  it('vaqtni daqiqa:soniya ko\'rinishida chiqaradi', () => {
    expect(formatRemaining(ACCESS_PASS_TTL_MS)).toBe('60:00');
    expect(formatRemaining(61_500)).toBe('01:02');
    expect(formatRemaining(0)).toBe('00:00');
  });

  it('bulutcha uchun qisqa vaqt kamida 1 daqiqa', () => {
    expect(formatRemainingShort(10_000)).toBe('1 daq');
    expect(formatRemainingShort(52 * 60_000)).toBe('52 daq');
  });
});

describe('saqlangan ruxsatnomani o\'qish', () => {
  it('to\'g\'ri yozuvni qaytaradi', () => {
    expect(parseStoredPass(JSON.stringify(pass), T0 + 1000)?.gymName).toBe('Olimp');
  });

  it('muddati o\'tganini, buzilganini va bo\'shini rad etadi', () => {
    expect(parseStoredPass(JSON.stringify(pass), T0 + ACCESS_PASS_TTL_MS + 1)).toBeNull();
    expect(parseStoredPass('{buzilgan', T0)).toBeNull();
    expect(parseStoredPass(JSON.stringify({ gymName: 'x' }), T0)).toBeNull();
    expect(parseStoredPass(null, T0)).toBeNull();
  });
});

describe('server javobidan ruxsatnoma', () => {
  it('bron vaqtini oraliq sifatida yozadi', () => {
    const p = buildAccessPass({
      booking: { id: 'b9', scheduledStartTime: '18:00', scheduledEndTime: '19:30' },
      gym: { id: 'g1', name: 'Olimp Fitness', imageUrl: '/i.png' },
      userName: 'Aziz',
      now: T0,
    });
    expect(p).toMatchObject({ bookingId: 'b9', gymName: 'Olimp Fitness', slot: '18:00 - 19:30', checkedInAt: T0 });
  });

  it('zal nomi kelmasa zaxira nomni ishlatadi', () => {
    expect(buildAccessPass({ now: T0, fallbackGymName: 'Aqua' }).gymName).toBe('Aqua');
  });
});

import { tashkentClock } from '../accessPass';

describe('Toshkent vaqti', () => {
  it('UTC dan 5 soat oldinda, sana ham to\'g\'ri', () => {
    // 2026-09-26 13:00:00 UTC -> 18:00:00 Toshkent
    expect(tashkentClock(T0)).toEqual({ hm: '18:00', hms: '18:00:00', date: '26 sentabr 2026' });
  });

  it('yarim tundan o\'tganda sana almashadi', () => {
    // 2026-09-26 20:30 UTC -> 27-sentabr 01:30 Toshkent
    expect(tashkentClock(Date.UTC(2026, 8, 26, 20, 30)).date).toBe('27 sentabr 2026');
  });
});
