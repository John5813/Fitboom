/**
 * Kirish sahifasidagi scroll hikoyasining vaqt shkalasi.
 *
 * Sahifa pastga surilgan sari `progress` 0 dan 1 gacha o'sadi. Bu fayl shu
 * sonni ikki narsaga aylantiradi:
 *   - 3D sahna qaysi ikki holat orasida turibdi va qancha o'tdi (`sceneBlend`)
 *   - har bir matn bloki qanchalik ko'rinadi (`beatOpacity`)
 *
 * Three.js ga bog'liq emas — shuning uchun test qilinadi va WebGL ishlamagan
 * qurilmada ham matnlar to'g'ri almashadi.
 */

/** Sahnaning 5 holati */
export const SCENE_STATES = {
  assembled: 0, // yig'ilgan shtanga
  boom: 1, // disklar portlab, sport buyumlariga aylanadi
  ring: 2, // buyumlar va disklar halqa bo'lib aylanadi — "bitta xarita"
  stack: 3, // hammasi yana diskka aylanib ustun bo'ladi — "bitta valyuta"
  finale: 4, // shtanga qayta yig'iladi
} as const;

/**
 * Har bir holat bir oz "ushlab turiladi" — matnni o'qishga vaqt bo'lsin.
 * Juftlar: [progress, holat]. Ketma-ket ikki nuqtada holat bir xil bo'lsa —
 * bu to'xtash, har xil bo'lsa — o'tish.
 */
const KEYS: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0],
  [0.06, 0],
  [0.2, 1],
  [0.32, 1], // sport buyumlari — eng uzoq to'xtash, ularni ko'rib olish kerak
  [0.47, 2],
  [0.55, 2],
  [0.72, 3],
  [0.8, 3],
  [0.95, 4],
  [1.0, 4],
];

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface SceneBlend {
  from: number;
  to: number;
  /** 0..1, allaqachon easing qo'llangan */
  t: number;
}

/** Scroll progressidan sahna holatlarini topadi */
export function sceneBlend(progress: number): SceneBlend {
  const p = clamp01(progress);
  for (let i = 1; i < KEYS.length; i++) {
    const [p0, s0] = KEYS[i - 1];
    const [p1, s1] = KEYS[i];
    if (p <= p1) {
      if (s0 === s1) return { from: s0, to: s1, t: 0 };
      const raw = clamp01((p - p0) / (p1 - p0));
      // Portlash keskin boshlanib, sekin tinadi; qolganlari silliq
      const t = s0 === 0 && s1 === 1 ? easeOutCubic(raw) : easeInOutCubic(raw);
      return { from: s0, to: s1, t };
    }
  }
  return { from: 4, to: 4, t: 0 };
}

/** Holat og'irligi: sahna shu holatga qanchalik yaqin (0..1) */
export function stateWeight(blend: SceneBlend, state: number): number {
  if (blend.from === state && blend.to === state) return 1;
  if (blend.from === state) return 1 - blend.t;
  if (blend.to === state) return blend.t;
  return 0;
}

/**
 * Matn bloklari. Har biri o'z holati to'xtagan paytda to'liq ko'rinadi.
 * [paydo bo'lish boshi, to'liq, yo'qolish boshi, yo'qolgan]
 */
export const BEAT_WINDOWS: ReadonlyArray<readonly [number, number, number, number]> = [
  [-1, 0, 0.04, 0.1], // 0 — bosh ekran: darhol ko'rinadi
  [0.14, 0.2, 0.32, 0.38], // 1 — sport turlari
  [0.4, 0.46, 0.55, 0.61], // 2 — halqa
  [0.65, 0.71, 0.8, 0.86], // 3 — ustun
  [0.89, 0.95, 2, 2], // 4 — yakun: oxirigacha qoladi
];

export function beatOpacity(progress: number, beat: number): number {
  const w = BEAT_WINDOWS[beat];
  if (!w) return 0;
  const [inStart, inEnd, outStart, outEnd] = w;
  const fadeIn = inStart < 0 ? 1 : smoothstep(inStart, inEnd, progress);
  const fadeOut = 1 - smoothstep(outStart, outEnd, progress);
  return fadeIn * fadeOut;
}

/**
 * Matn qaysi tomonga siljiydi: kirayotganda pastdan, chiqayotganda yuqoriga.
 * Qaytadi: -1..1 (0 — joyida).
 */
export function beatShift(progress: number, beat: number): number {
  const w = BEAT_WINDOWS[beat];
  if (!w) return 0;
  const mid = (w[1] + w[2]) / 2;
  const o = beatOpacity(progress, beat);
  return (progress < mid ? 1 : -1) * (1 - o);
}
