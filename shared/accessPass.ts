/**
 * Zalga kirish ruxsatnomasi — sayt va ilova uchun umumiy qoidalar.
 *
 * Mijoz zaldagi QR ni skanerlaganda server bronni "bajarildi" deb belgilaydi
 * va tashrifni yozadi — bu qaytarib bo'lmaydigan amal. Shundan keyin mijoz
 * administratorga ruxsatnomani ko'rsatishi kerak. Ilgari bu bir martalik
 * oyna edi: yopilsa, qaytib ochib bo'lmasdi.
 *
 * Endi ruxsatnoma qurilmada ACCESS_PASS_TTL_MS davomida saqlanadi va
 * ekrandagi "bulutcha" orqali istalgan payt qayta ochiladi.
 *
 * Eslatma: ruxsatnoma faqat shu qurilmada saqlanadi (serverda "qachon
 * kirdi" vaqti yo'q). Boshqa telefondan kirilsa ko'rinmaydi.
 */

export const ACCESS_PASS_TTL_MS = 60 * 60 * 1000;
export const ACCESS_PASS_STORAGE_KEY = "fitboom_access_pass";

export interface AccessPass {
  bookingId: string;
  gymId: string;
  gymName: string;
  gymImage?: string | null;
  userName?: string | null;
  /** "18:00 - 19:30" */
  slot?: string | null;
  /** ms, Date.now() */
  checkedInAt: number;
}

export function passExpiresAt(pass: AccessPass): number {
  return pass.checkedInAt + ACCESS_PASS_TTL_MS;
}

export function passRemainingMs(pass: AccessPass, now: number): number {
  return Math.max(0, passExpiresAt(pass) - now);
}

export function isPassActive(pass: AccessPass | null | undefined, now: number): pass is AccessPass {
  if (!pass) return false;
  // Kelajakdagi vaqt — soat noto'g'ri yoki ma'lumot buzilgan
  if (pass.checkedInAt > now + 60_000) return false;
  return passRemainingMs(pass, now) > 0;
}

/** 3540000 -> "59:00" (daqiqa:soniya) */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Bulutcha uchun qisqa ko'rinish: "52 daq" */
export function formatRemainingShort(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `${minutes} daq`;
}

/**
 * Saqlangan satrni o'qiydi. Buzilgan, eskirgan yoki muddati o'tgan
 * yozuv uchun null qaytaradi — chaqiruvchi uni o'chirib yuborishi kerak.
 */
export function parseStoredPass(raw: string | null | undefined, now: number): AccessPass | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const p = data as Record<string, unknown>;
  if (
    typeof p.bookingId !== "string" ||
    typeof p.gymId !== "string" ||
    typeof p.gymName !== "string" ||
    typeof p.checkedInAt !== "number" ||
    !Number.isFinite(p.checkedInAt)
  ) {
    return null;
  }
  const pass: AccessPass = {
    bookingId: p.bookingId,
    gymId: p.gymId,
    gymName: p.gymName,
    gymImage: typeof p.gymImage === "string" ? p.gymImage : null,
    userName: typeof p.userName === "string" ? p.userName : null,
    slot: typeof p.slot === "string" ? p.slot : null,
    checkedInAt: p.checkedInAt,
  };
  return isPassActive(pass, now) ? pass : null;
}

/** Server javobidagi bron va zaldan ruxsatnoma yasaydi */
export function buildAccessPass(input: {
  booking?: { id?: string; scheduledStartTime?: string | null; scheduledEndTime?: string | null; time?: string | null } | null;
  gym?: { id?: string; name?: string; imageUrl?: string | null } | null;
  fallbackGymName?: string;
  userName?: string | null;
  now: number;
}): AccessPass {
  const b = input.booking || {};
  const g = input.gym || {};
  const slot =
    b.scheduledStartTime && b.scheduledEndTime
      ? `${b.scheduledStartTime} - ${b.scheduledEndTime}`
      : b.time || null;
  return {
    bookingId: b.id || `local-${input.now}`,
    gymId: g.id || "",
    gymName: g.name || input.fallbackGymName || "Zal",
    gymImage: g.imageUrl || null,
    userName: input.userName || null,
    slot,
    checkedInAt: input.now,
  };
}

const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/**
 * Toshkent vaqti (UTC+5, yozgi vaqt yo'q).
 *
 * Ruxsatnomadagi soatni administrator devordagi soat bilan solishtiradi,
 * bron vaqti ham Toshkent vaqtida. Telefon boshqa mintaqaga sozlangan
 * bo'lsa ham bir xil ko'rinsin. Intl ga tayanmaydi — React Native'da ham
 * bir xil ishlaydi.
 */
export function tashkentClock(ms: number) {
  const d = new Date(ms + 5 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return {
    hm,
    hms: `${hm}:${pad(d.getUTCSeconds())}`,
    date: `${d.getUTCDate()} ${MONTHS_UZ[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
  };
}
