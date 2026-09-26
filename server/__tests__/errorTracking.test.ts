import { describe, it, expect } from 'vitest';
import { fingerprintOf } from '../errorTracking';

describe('fingerprintOf', () => {
  it('bir xil xato uchun bir xil barmoq izi', () => {
    const stack = 'Error: x\n    at handler (/app/server/routes.ts:42:10)';
    expect(fingerprintOf('Kredit yetarli emas', stack))
      .toBe(fingerprintOf('Kredit yetarli emas', stack));
  });

  it('turli xatolar uchun turli barmoq izi', () => {
    expect(fingerprintOf('Xato A')).not.toBe(fingerprintOf('Xato B'));
  });

  it('turli joydan kelgan bir xil xabar ajratiladi', () => {
    const a = 'Error\n    at bookGym (/app/server/routes.ts:10:1)';
    const b = 'Error\n    at cancelBooking (/app/server/routes.ts:99:1)';
    expect(fingerprintOf('Zal topilmadi', a)).not.toBe(fingerprintOf('Zal topilmadi', b));
  });

  /*
   * Eng muhim xossa: ID va raqamlar bilan farq qiladigan xabarlar bitta
   * yozuvga tushishi kerak. Aks holda bitta buzuq endpoint jurnalni har bir
   * foydalanuvchi uchun alohida qator bilan to'ldirib yuboradi.
   */
  it('UUID bilan farq qiladigan xabarlar birlashadi', () => {
    const a = 'Foydalanuvchi 3f2504e0-4f89-11d3-9a0c-0305e82c3301 topilmadi';
    const b = 'Foydalanuvchi 7c9e6679-7425-40de-944b-e07fc1f90ae7 topilmadi';
    expect(fingerprintOf(a)).toBe(fingerprintOf(b));
  });

  it('uzun raqamlar bilan farq qiladigan xabarlar birlashadi', () => {
    expect(fingerprintOf('Bron 1758271234567 topilmadi'))
      .toBe(fingerprintOf('Bron 1758279999999 topilmadi'));
  });

  it('kichik raqamlar saqlanadi — ular ma\'noli bo\'lishi mumkin', () => {
    // "5 kredit yetarli emas" va "9 kredit yetarli emas" — turli holatlar emas,
    // lekin 2 xonali raqam odatda ma'noli (status kod, kun soni)
    expect(fingerprintOf('HTTP 404')).not.toBe(fingerprintOf('HTTP 500'));
  });

  it('stack bo\'lmasa ham ishlaydi', () => {
    expect(fingerprintOf('Xato')).toHaveLength(32);
    expect(fingerprintOf('Xato', null)).toHaveLength(32);
  });

  it('barmoq izi doimiy uzunlikda', () => {
    expect(fingerprintOf('a'.repeat(500), 'b'.repeat(4000))).toHaveLength(32);
  });
});
