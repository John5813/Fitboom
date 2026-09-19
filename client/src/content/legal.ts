/**
 * Huquqiy hujjatlar matni.
 *
 * MUHIM: faktik bandlar (qanday ma'lumot yig'iladi, kredit qanday ishlaydi,
 * bekor qilish qoidasi) kodning haqiqiy xatti-harakatidan olingan va to'g'ri.
 * Yuridik bandlar — `TODO_YURIST` bilan belgilangan joylar — yurist tomonidan
 * to'ldirilishi va tasdiqlanishi SHART. Ularni shu holicha nashr qilmang.
 *
 * Kredit shartlari o'zgarsa (narx, muddat, bekor qilish oynasi), bu matnni ham
 * yangilash kerak — `shared/pricing.ts` bilan bir vaqtda.
 */

export const LEGAL_LAST_UPDATED = "2026-09-19";

/** Yurist to'ldirishi kerak bo'lgan joy */
export const TODO_YURIST = "[Yurist to'ldiradi]";

export interface LegalSection {
  heading: string;
  body: string[];
  /** true bo'lsa — bu band yurist ko'rigini kutmoqda */
  pending?: boolean;
}

export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

const COMPANY_PLACEHOLDER = [
  `Tashkilot nomi: ${TODO_YURIST}`,
  `STIR (INN): ${TODO_YURIST}`,
  `Yuridik manzil: ${TODO_YURIST}`,
  `Bank rekvizitlari: ${TODO_YURIST}`,
  `Aloqa: ${TODO_YURIST}`,
];

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "oferta",
    title: "Ommaviy oferta",
    summary: "FitBoom xizmatidan foydalanish bo'yicha shartnoma",
    sections: [
      {
        heading: "1. Tomonlar",
        pending: true,
        body: [
          "Ushbu hujjat FitBoom platformasi va foydalanuvchi o'rtasidagi ommaviy oferta hisoblanadi.",
          ...COMPANY_PLACEHOLDER,
        ],
      },
      {
        heading: "2. Xizmat mohiyati",
        body: [
          "FitBoom — sport zallariga yagona kredit tizimi orqali kirish imkonini beruvchi platforma.",
          "Foydalanuvchi kredit sotib oladi va ularni platformaga ulangan istalgan zalda ishlatadi.",
          "Zalga kirish QR kodni skanerlash orqali tasdiqlanadi.",
          "FitBoom sport xizmatini o'zi ko'rsatmaydi — u foydalanuvchi va sport zali o'rtasidagi vositachi.",
        ],
      },
      {
        heading: "3. Kreditlar",
        body: [
          "Kredit — platformadagi hisob birligi. Har bir zal o'z narxini kreditda belgilaydi.",
          "Kreditlar paketlar bilan sotiladi. Joriy paketlar va narxlar ilovaning \"Kredit to'ldirish\" bo'limida ko'rsatiladi.",
          "Kredit sotib olingan kundan boshlab 30 kun davomida amal qiladi.",
          "Muddat tugaganda ishlatilmagan kreditlar kuyadi va qaytarilmaydi.",
          "Muddat tugashidan 5 kun va 1 kun oldin Telegram orqali ogohlantirish yuboriladi (Telegram ulangan bo'lsa).",
          "Yangi paket sotib olinganda, agar amaldagi muddat hali tugamagan bo'lsa, u saqlanib qoladi; tugagan bo'lsa yangi 30 kunlik muddat boshlanadi.",
        ],
      },
      {
        heading: "4. To'lov",
        body: [
          "To'lov karta orqali o'tkazma bilan amalga oshiriladi. Foydalanuvchi to'lov chekining rasmini ilovaga yuklaydi.",
          "Kreditlar administrator chekni tasdiqlagandan keyin hisobga tushadi.",
          "Tasdiqlashdan keyin elektron fiskal chek Telegram orqali yuboriladi.",
        ],
      },
      {
        heading: "5. Bron qilish va bekor qilish",
        body: [
          "Foydalanuvchi zalni aniq sana va vaqt oralig'iga bron qiladi. Bron qilinganda kredit darhol yechiladi.",
          "Bron boshlanishiga 2 soatdan ko'p vaqt qolgan bo'lsa, bekor qilishda kredit to'liq qaytariladi.",
          "2 soatdan kam qolgan bo'lsa, kredit qaytarilmaydi.",
          "Belgilangan vaqtda kelmagan foydalanuvchining krediti qaytarilmaydi.",
          "Zal o'z ish vaqtini, dam kunlarini va band vaqtlarini belgilashi mumkin — bunday vaqtlarda bron qilib bo'lmaydi.",
        ],
      },
      {
        heading: "6. Tomonlarning javobgarligi",
        pending: true,
        body: [
          `Zal xizmat sifati uchun javobgarligi: ${TODO_YURIST}`,
          `Platformaning javobgarlik chegarasi: ${TODO_YURIST}`,
          `Nizolarni hal qilish tartibi: ${TODO_YURIST}`,
          `Fors-major holatlari: ${TODO_YURIST}`,
        ],
      },
      {
        heading: "7. Pulni qaytarish",
        pending: true,
        body: [
          `Sotib olingan kreditlarni qaytarish shartlari: ${TODO_YURIST}`,
          "Eslatma: hozirgi tizimda kredit qaytarish mexanizmi mavjud emas — faqat administrator qo'lda tuzata oladi. Yuristga shu holatni ayting.",
        ],
      },
      {
        heading: "8. Shartlarni o'zgartirish",
        pending: true,
        body: [`Oferta shartlarini o'zgartirish tartibi: ${TODO_YURIST}`],
      },
    ],
  },

  {
    slug: "maxfiylik",
    title: "Maxfiylik siyosati",
    summary: "Qanday ma'lumot yig'iladi va u nima uchun ishlatiladi",
    sections: [
      {
        heading: "1. Yig'iladigan ma'lumotlar",
        body: [
          "Telefon raqami — hisobga kirish va bog'lanish uchun.",
          "Telegram identifikatori va chat raqami — Telegram orqali kirish hamda bildirishnomalar uchun.",
          "Ism, yosh, jins — profilni to'ldirishda foydalanuvchi o'zi kiritadi.",
          "Profil rasmi — foydalanuvchi yuklasa.",
          "Joylashuv — faqat brauzerda, eng yaqin zallarni ko'rsatish uchun. Serverga yuborilmaydi va saqlanmaydi.",
          "Bron tarixi, zalga tashriflar va kredit operatsiyalari.",
          "To'lov cheklarining rasmlari — to'lovni tasdiqlash uchun.",
        ],
      },
      {
        heading: "2. Ma'lumot nima uchun ishlatiladi",
        body: [
          "Xizmatni ko'rsatish: bron qilish, zalga kirishni tasdiqlash, kredit hisobi.",
          "To'lovni tasdiqlash va fiskal chek berish.",
          "Bildirishnomalar: kredit muddati haqida ogohlantirish, to'lov holati.",
          "Xizmat sifatini yaxshilash uchun umumlashtirilgan statistika.",
        ],
      },
      {
        heading: "3. Ma'lumot kimga beriladi",
        body: [
          "Sport zaliga — siz o'sha zalga kirganingizda ismingiz va profil rasmingiz zal egasining panelida ko'rinadi.",
          "Telegram (Telegram Messenger LLP) — bildirishnomalar yetkazish uchun.",
          "SMS operatori — tasdiqlash kodini yuborish uchun.",
          "Ma'lumotlar uchinchi shaxslarga sotilmaydi va reklama maqsadida berilmaydi.",
        ],
      },
      {
        heading: "4. Saqlash muddati",
        pending: true,
        body: [
          `Ma'lumotlarni saqlash muddati: ${TODO_YURIST}`,
          "Texnik holat: hozirda hisob o'chirilganda shaxsiy ma'lumotlar anonimlashtiriladi, bron va to'lov yozuvlari esa buxgalteriya uchun saqlanib qoladi.",
        ],
      },
      {
        heading: "5. Sizning huquqlaringiz",
        body: [
          "Profil ma'lumotlarini istalgan vaqtda \"Profil\" bo'limida o'zgartirishingiz mumkin.",
          "Hisobingizni \"Sozlamalar\" bo'limidan o'chirishingiz mumkin. O'chirish qaytarib bo'lmaydi.",
          "Telegram bildirishnomalarini botni bloklash orqali to'xtatishingiz mumkin.",
        ],
      },
      {
        heading: "6. Xavfsizlik",
        body: [
          "Ulanish HTTPS orqali shifrlanadi.",
          "Parollar va sirlar ochiq holda saqlanmaydi.",
          "Zalga kirish QR kodi kriptografik imzo bilan himoyalangan.",
        ],
      },
      {
        heading: "7. Bog'lanish",
        pending: true,
        body: [`Ma'lumotlar bo'yicha murojaat uchun: ${TODO_YURIST}`],
      },
    ],
  },

  {
    slug: "shartlar",
    title: "Foydalanish shartlari",
    summary: "Platformadan foydalanish qoidalari",
    sections: [
      {
        heading: "1. Hisob",
        body: [
          "Hisob telefon raqami yoki Telegram orqali ochiladi.",
          "Bir foydalanuvchi — bir hisob. Hisobni boshqalarga berish taqiqlanadi.",
          "Zalga kirish QR kodi shaxsiy. Uni boshqa odamga berish yoki nusxalash taqiqlanadi.",
        ],
      },
      {
        heading: "2. Yosh chegarasi",
        body: [
          "Platformadan 16 yoshdan katta shaxslar mustaqil foydalanishi mumkin.",
          "16 yoshgacha bo'lganlar uchun ota-ona yoki vasiyning roziligi talab qilinadi.",
          "Sport zallari o'z yosh talablarini belgilashi mumkin.",
        ],
      },
      {
        heading: "3. Zalda xulq-atvor",
        body: [
          "Foydalanuvchi zalning ichki tartib qoidalariga rioya qilishi shart.",
          "Zal o'z qoidalarini buzgan foydalanuvchini kiritmasligi mumkin. Bunday holatda kredit qaytarilmaydi.",
          "Sog'lig'ingiz uchun javobgarlik o'zingizda. Mashg'ulotdan oldin shifokor bilan maslahatlashing.",
        ],
      },
      {
        heading: "4. Taqiqlangan harakatlar",
        body: [
          "Soxta QR kod yaratish yoki tizimni chetlab o'tishga urinish.",
          "Boshqa foydalanuvchi hisobiga kirish.",
          "Platformaga avtomatlashtirilgan so'rovlar yuborish.",
          "Bunday harakatlar aniqlanganda hisob kreditlarni qaytarmasdan bloklanadi.",
        ],
      },
      {
        heading: "5. Video darslar",
        body: [
          "Video kurslar kredit bilan ochiladi va faqat platforma ichida ko'riladi.",
          "Videolarni yuklab olish, tarqatish yoki nusxalash taqiqlanadi.",
          "Ochilgan kursga kirish muddati cheklanmagan.",
        ],
      },
      {
        heading: "6. Xizmatni to'xtatish",
        pending: true,
        body: [
          `Hisobni bloklash asoslari va tartibi: ${TODO_YURIST}`,
          `Xizmat to'xtatilganda kreditlar taqdiri: ${TODO_YURIST}`,
        ],
      },
    ],
  },
];

export function findLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
