import { describe, it, expect } from 'vitest';
import {
  sceneBlend, stateWeight, beatOpacity, beatShift, BEAT_WINDOWS,
} from '../components/landing/storyTimeline';

describe('3D sahna holatlari', () => {
  it('boshida yig\'ilgan shtanga, oxirida yakuniy holat', () => {
    expect(sceneBlend(0)).toEqual({ from: 0, to: 0, t: 0 });
    expect(sceneBlend(1)).toEqual({ from: 4, to: 4, t: 0 });
  });

  it('diapazondan tashqari qiymatlar chegaralanadi', () => {
    expect(sceneBlend(-3)).toEqual(sceneBlend(0));
    expect(sceneBlend(7)).toEqual(sceneBlend(1));
  });

  it('holatlar tartib bilan, sakrashsiz o\'tadi', () => {
    let prevFrom = 0;
    for (let p = 0; p <= 1.0001; p += 0.001) {
      const b = sceneBlend(p);
      expect(b.to - b.from).toBeGreaterThanOrEqual(0);
      expect(b.to - b.from).toBeLessThanOrEqual(1);
      expect(b.from).toBeGreaterThanOrEqual(prevFrom);
      expect(b.t).toBeGreaterThanOrEqual(0);
      expect(b.t).toBeLessThanOrEqual(1);
      prevFrom = b.from;
    }
  });

  it('har bir holat kamida bir marta to\'liq ushlab turiladi', () => {
    const held = new Set<number>();
    for (let p = 0; p <= 1; p += 0.005) {
      const b = sceneBlend(p);
      if (b.from === b.to) held.add(b.from);
    }
    expect([...held].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('holat og\'irliklari yig\'indisi doim 1', () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const b = sceneBlend(p);
      const sum = [0, 1, 2, 3, 4].reduce((s, i) => s + stateWeight(b, i), 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });
});

describe('matn bloklari', () => {
  it('bosh ekran matni darhol to\'liq ko\'rinadi', () => {
    expect(beatOpacity(0, 0)).toBe(1);
    expect(beatShift(0, 0)).toBe(0);
  });

  it('yakuniy matn oxirida to\'liq ko\'rinadi', () => {
    expect(beatOpacity(1, BEAT_WINDOWS.length - 1)).toBe(1);
  });

  it('har bir blok o\'z vaqtida to\'liq ko\'rinadi', () => {
    BEAT_WINDOWS.forEach(([, full, out], i) => {
      const mid = (Math.max(full, 0) + Math.min(out, 1)) / 2;
      expect(beatOpacity(mid, i)).toBe(1);
    });
  });

  it('bir vaqtda ikki blok to\'liq ko\'rinmaydi — matnlar ustma-ust tushmaydi', () => {
    for (let p = 0; p <= 1; p += 0.002) {
      const visible = BEAT_WINDOWS.map((_, i) => beatOpacity(p, i)).filter((o) => o > 0.05);
      expect(visible.length).toBeLessThanOrEqual(1);
    }
  });

  it('noma\'lum blok ko\'rinmaydi', () => {
    expect(beatOpacity(0.5, 99)).toBe(0);
  });
});
