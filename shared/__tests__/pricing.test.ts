import { describe, it, expect } from 'vitest';
import {
  CREDIT_PACKAGES, ALLOWED_CREDIT_AMOUNTS, priceForCredits,
  averageCostPerCredit, GYM_PAYOUT_PER_CREDIT_UZS, gymPayoutForVisit,
} from '../pricing';

describe('kredit paketlari', () => {
  it('har bir paketda musbat kredit va narx bor', () => {
    for (const p of CREDIT_PACKAGES) {
      expect(p.credits).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('eng katta paket eng kichigidan arzonroq (kredit boshiga)', () => {
    const perCredit = CREDIT_PACKAGES.map((p) => p.price / p.credits);
    expect(perCredit[perCredit.length - 1]).toBeLessThan(perCredit[0]);
  });

  /*
   * DIQQAT — hal qilinmagan narx masalasi.
   *
   * Hozirgi narxlarda 240 lik paket 130 likdan QIMMATROQ:
   *   130 -> 350 000  =  2 692 so'm / kredit
   *   240 -> 650 000  =  2 708 so'm / kredit
   *
   * Ya'ni ko'proq sotib olgan mijoz ko'proq to'laydi. Bu test hozirgi holatni
   * qayd etadi; narx to'g'rilangach (masalan 240 -> 630 000) uni yuqoridagi
   * "har bir keyingi paket arzonroq" shartiga almashtirish kerak.
   */
  it('hozircha 240 lik paket 130 likdan qimmat — tuzatilishi kutilmoqda', () => {
    const p130 = CREDIT_PACKAGES.find((p) => p.credits === 130)!;
    const p240 = CREDIT_PACKAGES.find((p) => p.credits === 240)!;
    expect(p240.price / p240.credits).toBeGreaterThan(p130.price / p130.credits);
  });

  it('ruxsat etilgan miqdorlar paketlardan olinadi', () => {
    expect(ALLOWED_CREDIT_AMOUNTS).toEqual(CREDIT_PACKAGES.map((p) => p.credits));
  });

  it('narxni kredit miqdori bo\'yicha topadi', () => {
    expect(priceForCredits(60)).toBe(180_000);
    expect(priceForCredits(999)).toBeUndefined();
  });
});

describe('marja', () => {
  /*
   * Eng muhim test.
   *
   * Ilgari web tarifi 30 000, mobil tarifi 1 500 so'm edi va web narxlari
   * mobil narxlaridan uch baravar yuqori edi. Natijada web kanalida har bir
   * kredit uchun platforma ~27 000 so'm zarar ko'rardi.
   *
   * Bu test narxlar qayta o'zgartirilganda zararli kombinatsiya jim o'tib
   * ketmasligi uchun.
   */
  it("zalga to'lov mijoz narxidan past — har tashrif foydali", () => {
    const cost = averageCostPerCredit();
    expect(GYM_PAYOUT_PER_CREDIT_UZS).toBeLessThan(cost);
  });

  it('marja kamida 20% bo\'lishi kerak', () => {
    const cost = averageCostPerCredit();
    const margin = (cost - GYM_PAYOUT_PER_CREDIT_UZS) / cost;
    expect(margin).toBeGreaterThanOrEqual(0.2);
  });

  it('tashrif summasi kreditga proporsional', () => {
    expect(gymPayoutForVisit(1)).toBe(GYM_PAYOUT_PER_CREDIT_UZS);
    expect(gymPayoutForVisit(3)).toBe(GYM_PAYOUT_PER_CREDIT_UZS * 3);
  });
});
