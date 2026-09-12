import { describe, it, expect } from 'vitest';
import { normalizePhone, generateOtp } from '../sms';

describe('normalizePhone', () => {
  it('bo\'shliq va chiziqchalarni olib tashlaydi', () => {
    expect(normalizePhone('+998 90 123-45-67')).toBe('998901234567');
  });

  it('plus belgisini olib tashlaydi', () => {
    expect(normalizePhone('+998901234567')).toBe('998901234567');
  });

  it('8 bilan boshlanuvchi 11 xonali raqamni 7 ga o\'giradi', () => {
    expect(normalizePhone('89161234567')).toBe('79161234567');
  });

  it('bir xil raqamning turli yozuvlari bir xil natija beradi', () => {
    const variants = ['+998 90 123 45 67', '998901234567', '+998-90-123-45-67'];
    const results = variants.map(normalizePhone);
    expect(new Set(results).size).toBe(1);
  });
});

describe('generateOtp', () => {
  it('har doim 6 xonali kod qaytaradi', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });
});
