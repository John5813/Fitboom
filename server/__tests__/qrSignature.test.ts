import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.QR_SECRET = 'test-qr-secret-for-unit-tests';
});

const { createGymQr, verifyGymQr, isAuthenticGymQr, signGymQr } = await import('../qrSignature');

describe('gym QR imzosi', () => {
  it('yaratilgan QR o\'z imzosi bilan tasdiqlanadi', () => {
    const raw = createGymQr('gym-123', 'Test Zal');
    const parsed = JSON.parse(raw);
    expect(parsed.gymId).toBe('gym-123');
    expect(verifyGymQr(parsed)).toBe(true);
  });

  it('gym ID o\'zgartirilsa imzo yaroqsiz bo\'ladi', () => {
    const parsed = JSON.parse(createGymQr('gym-123', 'Test Zal'));
    parsed.gymId = 'gym-999';
    expect(verifyGymQr(parsed)).toBe(false);
  });

  it('o\'zi yasalgan imzosiz QR rad etiladi', () => {
    // Aynan shu hujum ilgari ishlagan edi: gym ID ommaviy edi va
    // {"gymId": "..."} yuborish kifoya qilardi.
    const forged = { gymId: 'gym-123', type: 'gym' };
    expect(verifyGymQr(forged)).toBe(false);
    expect(isAuthenticGymQr(JSON.stringify(forged), forged, null)).toBe(false);
  });

  it('taxmin qilingan imzo rad etiladi', () => {
    const parsed = JSON.parse(createGymQr('gym-123', 'Test Zal'));
    parsed.sig = 'a'.repeat(32);
    expect(verifyGymQr(parsed)).toBe(false);
  });

  it('imzo gym ID va nonce ga bog\'liq', () => {
    expect(signGymQr('a', 'n1')).not.toBe(signGymQr('b', 'n1'));
    expect(signGymQr('a', 'n1')).not.toBe(signGymQr('a', 'n2'));
    expect(signGymQr('a', 'n1')).toBe(signGymQr('a', 'n1'));
  });

  it('imzosiz eski QR faqat saqlangan qiymatga aynan mos kelsa qabul qilinadi', () => {
    const legacy = JSON.stringify({ gymId: 'gym-1', type: 'gym', timestamp: '2025-01-01T00:00:00.000Z' });
    expect(isAuthenticGymQr(legacy, JSON.parse(legacy), legacy)).toBe(true);
    expect(isAuthenticGymQr(legacy, JSON.parse(legacy), '{"gymId":"gym-1"}')).toBe(false);
  });
});
