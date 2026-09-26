import { describe, it, expect } from 'vitest';
import {
  CREDIT_PACKAGES, ALLOWED_CREDIT_AMOUNTS, priceForCredits,
  averageCostPerCredit, GYM_PAYOUT_PER_CREDIT_UZS, gymPayoutForVisit,
  perCreditPrice, discountPercent,
} from '../pricing';

describe('kredit paketlari', () => {
  it('har bir paketda musbat kredit va narx bor', () => {
    for (const p of CREDIT_PACKAGES) {
      expect(p.credits).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('paketlar kredit bo\'yicha o\'sib boradi', () => {
    for (let i = 1; i < CREDIT_PACKAGES.length; i++) {
      expect(CREDIT_PACKAGES[i].credits).toBeGreaterThan(CREDIT_PACKAGES[i - 1].credits);
    }
  });

  /*
   * Narx zinapoyasining asosiy qoidasi.
   *
   * Ilgari 240 lik paket 130 likdan qimmatroq edi (2 708 vs 2 692 so'm/kredit)
   * — ya'ni ko'proq sotib olgan mijoz ko'proq to'lardi. 240 -> 600 000 qilib
   * tuzatildi. Bu test shu xatoning qaytib kelishiga yo'l qo'ymaydi.
   */
  it('har bir keyingi paket kredit boshiga arzonroq', () => {
    const perCredit = CREDIT_PACKAGES.map((p) => p.price / p.credits);
    for (let i = 1; i < perCredit.length; i++) {
      expect(perCredit[i]).toBeLessThan(perCredit[i - 1]);
    }
  });

  it('chegirma eng katta paketda kamida 15%', () => {
    const base = CREDIT_PACKAGES[0].price / CREDIT_PACKAGES[0].credits;
    const last = CREDIT_PACKAGES[CREDIT_PACKAGES.length - 1];
    const discount = 1 - last.price / last.credits / base;
    expect(discount).toBeGreaterThanOrEqual(0.15);
  });

  it('narxlar 10 000 so\'mga karrali — naqd to\'lov uchun qulay', () => {
    for (const p of CREDIT_PACKAGES) {
      expect(p.price % 10_000).toBe(0);
    }
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

describe('mijozga ko\'rsatiladigan chegirma', () => {
  it('eng kichik paketda chegirma yo\'q', () => {
    expect(discountPercent(CREDIT_PACKAGES[0])).toBe(0);
  });

  it('chegirma paketdan paketga o\'sib boradi', () => {
    const d = CREDIT_PACKAGES.map(discountPercent);
    for (let i = 1; i < d.length; i++) {
      expect(d[i]).toBeGreaterThan(d[i - 1]);
    }
  });

  it('kredit boshiga narx to\'g\'ri hisoblanadi', () => {
    expect(perCreditPrice({ credits: 60, price: 180_000 })).toBe(3_000);
  });
});
