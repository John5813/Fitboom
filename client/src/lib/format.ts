/**
 * Raqam va pul formatlash.
 *
 * `toLocaleString('uz-UZ')` ga tayanib bo'lmaydi: ba'zi brauzerlarda uz-UZ ICU
 * ma'lumoti yo'q va u jim turib en-US ga tushadi — natijada "47,200,000" kabi
 * vergulli yozuv chiqadi. Shuning uchun guruhlash bu yerda aniq bajariladi.
 */

const NBSP = " ";

/** 1234567 -> "1 234 567" (uzilmas probel bilan) */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const sign = value < 0 ? "-" : "";
  const digits = Math.round(Math.abs(value)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return sign + grouped;
}

/** 1234567 -> "1 234 567 so'm" */
export function formatSom(value: number): string {
  return `${formatNumber(value)}${NBSP}so'm`;
}

/**
 * Tor joylar (statistika kartalari) uchun ixcham yozuv.
 * 1 500 000 -> "1,5 mln" · 47 000 -> "47 ming"
 *
 * To'liq qiymatni `title` atributida ko'rsating — ixcham yozuv o'qish uchun,
 * aniqlik uchun emas.
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  // Faqat million va undan yuqorisi qisqartiriladi.
  // "ming" bosqichi aniqlikni yo'qotardi: 14 850 -> "15 ming" bo'lib ketardi,
  // holbuki "14 850" kartaga bemalol sig'adi.
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)} mlrd`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)} mln`;
  return formatNumber(value);
}

/** Ixcham pul: "1,5 mln so'm" */
export function formatCompactSom(value: number): string {
  return `${formatCompact(value)}${NBSP}so'm`;
}

/** Bir xonali kasrgacha, keraksiz nolsiz: 1.50 -> "1,5" · 2.00 -> "2" */
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

/** Sana: "14 sen 2026" */
export function formatDateShort(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Sana va vaqt: "14 sen, 18:30" */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${months[d.getMonth()]}, ${hh}:${mm}`;
}
