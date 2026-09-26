/**
 * Fon vazifalari.
 *
 * Ilgari bu ishlar foydalanuvchi so'roviga "ilashib" bajarilardi: masalan
 * bron faqat mijoz o'z bronlar ro'yxatini ochganda "missed" deb belgilanardi.
 * Mijoz ilovani ochmasa, bron abadiy `pending` bo'lib qolardi va band qilingan
 * joy bo'shatilmasdi — zal egasining bandlik raqamlari buzilardi.
 *
 * Endi bu funksiyalar tashqi cron orqali ham chaqiriladi (POST /api/cron/run),
 * shuning uchun ular foydalanuvchi faolligiga bog'liq emas.
 */
import type { IStorage } from './storage';

/** Toshkent (UTC+5) bo'yicha hozirgi vaqt */
function tashkentNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5 * 3600000);
}

export function tashkentDateStr(d = tashkentNow()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function tashkentTimeStr(d = tashkentNow()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Bron vaqti o'tib ketganmi? (tugashdan keyin 1 soat imkon beriladi) */
export function isMissed(
  booking: { date: string | null; scheduledEndTime?: string | null },
  todayStr: string,
  currentTime: string,
): boolean {
  if (!booking.date) return false;
  const dateStr = booking.date.split('T')[0];

  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  // Bugungi bron: tugash vaqtidan 1 soat o'tgandan keyin
  if (!booking.scheduledEndTime) return false;
  const [endH, endM] = booking.scheduledEndTime.split(':').map(Number);
  if (Number.isNaN(endH) || Number.isNaN(endM)) return false;

  const graceMinutes = (endH + 1) * 60 + endM;
  const [curH, curM] = currentTime.split(':').map(Number);
  return curH * 60 + curM >= graceMinutes;
}

export interface SweepResult {
  checked: number;
  markedMissed: number;
  slotsReleased: number;
}

/**
 * Vaqti o'tgan bronlarni "missed" deb belgilaydi va band qilingan joyni
 * bo'shatadi.
 *
 * Idempotent: allaqachon belgilangan bronlarga qayta tegmaydi, shuning uchun
 * xohlagancha tez-tez chaqirish mumkin.
 */
export async function sweepMissedBookings(storage: IStorage): Promise<SweepResult> {
  const todayStr = tashkentDateStr();
  const currentTime = tashkentTimeStr();

  const all = await storage.getBookings();
  const open = all.filter(
    (b) => !b.isCompleted && b.status !== 'missed' && b.status !== 'completed' && b.status !== 'cancelled',
  );

  let markedMissed = 0;
  let slotsReleased = 0;

  for (const booking of open) {
    if (!isMissed(booking as any, todayStr, currentTime)) continue;

    await storage.updateBookingStatus(booking.id, 'missed');
    markedMissed++;

    // Joyni bo'shatamiz — aks holda o'sha sanadagi sig'im abadiy band bo'lib qoladi
    if (booking.timeSlotId && booking.date) {
      await storage.releaseSlotOnDate(booking.timeSlotId, booking.date.split('T')[0]);
      slotsReleased++;
    }
  }

  return { checked: open.length, markedMissed, slotsReleased };
}
