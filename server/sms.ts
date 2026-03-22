const DEVSMS_API_KEY = process.env.DEVSMS_API_KEY || '';

interface SmsOtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const smsOtpStore = new Map<string, SmsOtpEntry>();

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const lastSentAt = new Map<string, number>();

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/\s/g, '').replace(/-/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('8') && p.length === 11) p = '7' + p.slice(1);
  return p;
}

export async function sendSmsCode(phone: string): Promise<{ success: boolean; message: string; cooldown?: number }> {
  const normalized = normalizePhone(phone);

  const lastSent = lastSentAt.get(normalized);
  if (lastSent && Date.now() - lastSent < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
    return { success: false, message: `Iltimos ${wait} soniya kuting`, cooldown: wait };
  }

  if (!DEVSMS_API_KEY) {
    console.error('[SMS] DEVSMS_API_KEY sozlanmagan');
    return { success: false, message: 'SMS xizmati sozlanmagan' };
  }

  const code = generateOtp();

  try {
    const response = await fetch('https://devsms.uz/api/send_sms.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEVSMS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalized,
        type: 'universal_otp',
        template_type: 1,
        service_name: 'FitBoom',
        otp_code: code,
      }),
    });

    const resultText = await response.text();
    console.log('[SMS] devsms.uz javobi:', resultText);

    let json: any = {};
    try { json = JSON.parse(resultText); } catch {}

    if (!response.ok || json.success === false) {
      console.error('[SMS] Xatolik:', resultText);
      return { success: false, message: json.message || 'SMS yuborishda xatolik yuz berdi' };
    }
  } catch (err) {
    console.error('[SMS] Tarmoq xatoligi:', err);
    return { success: false, message: 'SMS yuborishda xatolik yuz berdi' };
  }

  smsOtpStore.set(normalized, { code, expiresAt: Date.now() + OTP_EXPIRY_MS, attempts: 0 });
  lastSentAt.set(normalized, Date.now());

  return { success: true, message: 'SMS yuborildi' };
}

export function verifySmsCode(phone: string, code: string): { success: boolean; message: string } {
  const normalized = normalizePhone(phone);
  const entry = smsOtpStore.get(normalized);

  if (!entry) return { success: false, message: "Kod topilmadi. Qaytadan SMS so'rang" };
  if (Date.now() > entry.expiresAt) {
    smsOtpStore.delete(normalized);
    return { success: false, message: "Kod muddati o'tgan. Qaytadan SMS so'rang" };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    smsOtpStore.delete(normalized);
    return { success: false, message: "Juda ko'p noto'g'ri urinish. Qaytadan SMS so'rang" };
  }

  if (entry.code !== code.trim()) {
    entry.attempts++;
    smsOtpStore.set(normalized, entry);
    return { success: false, message: `Kod noto'g'ri. ${MAX_ATTEMPTS - entry.attempts} ta urinish qoldi` };
  }

  smsOtpStore.delete(normalized);
  return { success: true, message: 'Tasdiqlandi' };
}

setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of smsOtpStore.entries()) {
    if (now > entry.expiresAt) smsOtpStore.delete(phone);
  }
  for (const [phone, ts] of lastSentAt.entries()) {
    if (now - ts > RESEND_COOLDOWN_MS * 10) lastSentAt.delete(phone);
  }
}, 10 * 60 * 1000);
