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
  { credits: 240, price: 650_000 },
];

/** Server tekshiruvi uchun ruxsat etilgan kredit miqdorlari */
export const ALLOWED_CREDIT_AMOUNTS = CREDIT_PACKAGES.map((p) => p.credits);

/** Paket narxini kredit miqdoriga qarab topadi */
export function priceForCredits(credits: number): number | undefined {
  return CREDIT_PACKAGES.find((p) => p.credits === credits)?.price;
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
