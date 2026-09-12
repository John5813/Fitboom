import { describe, it, expect, vi } from 'vitest';
import { publicGym, pickFields, rateLimit, GYM_ADMIN_EDITABLE_FIELDS } from '../security';

describe('publicGym', () => {
  it('qrCode va ownerAccessCode ni olib tashlaydi', () => {
    const gym: any = {
      id: 'g1', name: 'Zal', credits: 5,
      qrCode: '{"gymId":"g1"}', ownerAccessCode: 'SECRET1',
    };
    const result: any = publicGym(gym);
    expect(result.id).toBe('g1');
    expect(result.name).toBe('Zal');
    expect(result.qrCode).toBeUndefined();
    expect(result.ownerAccessCode).toBeUndefined();
  });
});

describe('pickFields', () => {
  it('faqat ruxsat etilgan maydonlarni qoldiradi', () => {
    // Mass-assignment himoyasi: ilgari currentDebt va ownerAccessCode ni
    // oddiy PUT so'rov orqali o'zgartirish mumkin edi.
    const input: any = {
      name: 'Yangi nom',
      currentDebt: 0,
      totalEarnings: 999999,
      ownerAccessCode: 'HACKED',
    };
    const result: any = pickFields(input, GYM_ADMIN_EDITABLE_FIELDS);
    expect(result.name).toBe('Yangi nom');
    expect(result.currentDebt).toBeUndefined();
    expect(result.totalEarnings).toBeUndefined();
    expect(result.ownerAccessCode).toBeUndefined();
  });

  it('undefined qiymatlarni tashlab ketadi', () => {
    const result = pickFields({ name: undefined, address: 'Toshkent' } as any, ['name', 'address']);
    expect(result).toEqual({ address: 'Toshkent' });
  });
});

describe('rateLimit', () => {
  function makeRes() {
    const res: any = { statusCode: 200, body: null, headers: {} };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
    return res;
  }

  it('limitdan oshganda 429 qaytaradi', () => {
    const limiter = rateLimit('test-bucket', { windowMs: 60_000, max: 3 });
    const req: any = { ip: '1.2.3.4' };
    const next = vi.fn();

    for (let i = 0; i < 3; i++) limiter(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(3);

    const blocked = makeRes();
    limiter(req, blocked, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['Retry-After']).toBeDefined();
  });

  it('har bir IP uchun alohida hisoblaydi', () => {
    const limiter = rateLimit('test-bucket-2', { windowMs: 60_000, max: 1 });
    const next = vi.fn();
    limiter({ ip: '1.1.1.1' } as any, makeRes(), next);
    limiter({ ip: '2.2.2.2' } as any, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
