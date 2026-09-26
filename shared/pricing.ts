/**
 * Narxlar — YAGONA manba.
 *
 * DIQQAT: bu fayl paydo bo'lishidan oldin narxlar uch joyda alohida yozilgan
 * edi va bir-biriga zid edi:
 *
 *   Mijoz to'laydigan narx
 *     web  (PurchaseCreditsDialog): 60 -> 180 000  (3 000 so'm / kredit)
 *     mobil (mobileRoutes)        : 60 ->  60 000  (1 000 so'm / kredit)
 *
 *   Zalga hisoblanadigan summa
 *     web  (routes.ts CREDIT_VALUE_UZS): 30 000 so'm / kredit
 *     mobil (mobileRoutes)             :  1 500 so'm / kredit
 *
 * Ya'ni bitta mijoz mobil ilovadan uch baravar arzon sotib olardi, zal esa
 * mijoz qaysi kanaldan kelganiga qarab 20 baravar farq qiladigan summa olardi.
 *
 * Quyidagi qiymatlar — zarar keltirmaydigan yagona kombinatsiya:
 * mijoz 3 000 so'm to'laydi, zalga 1 500 so'm hisoblanadi, platformaga
 * 1 500 so'm (50%) qoladi. Haqiqiy raqamlarni tasdiqlash biznes qarori —
 * ularni GYM_PAYOUT_PER_CREDIT_UZS orqali o'zgartirish mumkin.
 *
 * NARX ZINAPOYASI (tuzatilgan)
 *
 * Ilgari 240 lik paket 130 likdan qimmatroq edi:
 *    60 -> 180 000 = 3 000 / kredit
 *   130 -> 350 000 = 2 692 / kredit
 *   240 -> 650 000 = 2 708 / kredit   <-- ko'proq olgan ko'proq to'lardi
 *
 * Bu mijozga ko'rinadigan mantiqsizlik edi: eng katta paketni olish zarar.
 * Endi eng katta paket eng arzon:
 *    60 -> 180 000 = 3 000 / kredit   (chegirma yo'q)
 *   130 -> 350 000 = 2 692 / kredit   (-10.3%)
 *   240 -> 600 000 = 2 500 / kredit   (-16.7%)
 *
 * 650 000 -> 600 000 — narx TUSHIRILDI, oshirilmadi: hech bir mijoz
 * avvalgidan yomon holatga tushmaydi. Raqamlar 10 000 ga karrali bo'lib
 * qoldi (naqd/karta o'tkazmasi uchun qulay).
 *
 * MARJA: o'rtacha tannarx 1 130 000 / 430 = 2 628 so'm/kredit.
 * Zalga 1 500 so'm ketadi => marja ~42.9%. `pricing.test.ts` bu chegarani
 * (kamida 20%) avtomatik tekshiradi — narxni o'zgartirsangiz test aytadi.
 */

export interface CreditPackage {
  credits: number;
  price: number;
  isPopular?: boolean;
}

/** Sotuvdagi kredit paketlari */
export const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 60, price: 180_000 },
  { credits: 130, price: 350_000, isPopular: true },
  { credits: 240, price: 600_000 },
];

/** Server tekshiruvi uchun ruxsat etilgan kredit miqdorlari */
export const ALLOWED_CREDIT_AMOUNTS = CREDIT_PACKAGES.map((p) => p.credits);

/** Paket narxini kredit miqdoriga qarab topadi */
export function priceForCredits(credits: number): number | undefined {
  return CREDIT_PACKAGES.find((p) => p.credits === credits)?.price;
}

/** Paketda bitta kredit necha so'mga tushadi */
export function perCreditPrice(pkg: CreditPackage): number {
  return pkg.price / pkg.credits;
}

/**
 * Paketning eng kichik paketga nisbatan chegirmasi (foizda, butun son).
 *
 * Mijozga ko'rsatish uchun: "16% tejash". Eng kichik paket uchun 0 qaytadi.
 */
export function discountPercent(pkg: CreditPackage): number {
  const base = perCreditPrice(CREDIT_PACKAGES[0]);
  return Math.round((1 - perCreditPrice(pkg) / base) * 100);
}

/** Bitta kredit mijozga o'rtacha necha so'mga tushadi */
export function averageCostPerCredit(): number {
  const totalCredits = CREDIT_PACKAGES.reduce((s, p) => s + p.credits, 0);
  const totalPrice = CREDIT_PACKAGES.reduce((s, p) => s + p.price, 0);
  return totalPrice / totalCredits;
}

/**
 * Mijoz zalga kirganda zal hisobiga qo'shiladigan summa (1 kredit uchun).
 *
 * Bu — platformaning zal oldidagi qarzi. Mijozning kredit narxidan past
 * bo'lishi shart, aks holda har bir tashrif zarar keltiradi.
 */
export const GYM_PAYOUT_PER_CREDIT_UZS = Number(
  process.env.GYM_PAYOUT_PER_CREDIT_UZS ?? 1_500,
);

/** Bitta tashrif uchun zalga hisoblanadigan summa */
export function gymPayoutForVisit(gymCredits: number): number {
  return Math.round(gymCredits * GYM_PAYOUT_PER_CREDIT_UZS);
}
