import { describe, it, expect } from 'vitest';
import { formatNumber, formatSom, formatCompact, formatCompactSom } from '../lib/format';

const NBSP = ' ';

describe('formatNumber', () => {
  it('uch xonadan guruhlaydi', () => {
    expect(formatNumber(1234567)).toBe(`1${NBSP}234${NBSP}567`);
    expect(formatNumber(1000)).toBe(`1${NBSP}000`);
    expect(formatNumber(999)).toBe('999');
  });

  it("lokal mavjudligiga bog'liq emas — har doim probel bilan", () => {
    // toLocaleString('uz-UZ') ba'zi brauzerlarda en-US ga tushib vergul chiqarardi
    expect(formatNumber(47200000)).not.toContain(',');
    expect(formatNumber(47200000)).toBe(`47${NBSP}200${NBSP}000`);
  });

  it("manfiy va nolni to'g'ri qaytaradi", () => {
    expect(formatNumber(-1500)).toBe(`-1${NBSP}500`);
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatCompact', () => {
  it('millionlarni qisqartiradi', () => {
    expect(formatCompact(1_500_000)).toBe('1,5 mln');
    expect(formatCompact(2_000_000)).toBe('2 mln');
    expect(formatCompact(284_500_000)).toBe('284,5 mln');
  });

  it('milliondan kichik sonlarni to\'liq qoldiradi — aniqlik yo\'qolmaydi', () => {
    // 14 850 ilgari "15 ming" bo'lib ketardi
    expect(formatCompact(14_850)).toBe(`14${NBSP}850`);
    expect(formatCompact(178_200)).toBe(`178${NBSP}200`);
    expect(formatCompact(999)).toBe('999');
  });

  it('milliarddan yuqorisini ham qisqartiradi', () => {
    expect(formatCompact(2_400_000_000)).toBe('2,4 mlrd');
  });
});

describe('formatSom', () => {
  it("so'm ni bir marta qo'shadi", () => {
    const result = formatSom(150000);
    expect(result).toContain("so'm");
    expect(result.match(/so'm/g)).toHaveLength(1);
  });
});

describe('formatCompactSom', () => {
  it('ixcham pul yozuvi', () => {
    expect(formatCompactSom(1_500_000)).toBe(`1,5 mln${NBSP}so'm`);
  });
});
