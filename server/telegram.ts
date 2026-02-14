import type { Express } from 'express';
import type { IStorage } from './storage';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'Fitboom_bot';

const CODE_EXPIRY_MS = 5 * 60 * 1000;
const CODE_REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 3;

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id: number;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
  contact?: TelegramContact;
  photo?: any[];
  video?: any;
  document?: any;
  animation?: any;
  audio?: any;
  voice?: any;
  caption?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const pendingAmountChanges = new Map<string, string>();
const adminBroadcastMode = new Map<string, boolean>();

function getAppUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    if (domains.length > 0) return `https://${domains[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'https://fitboom--replituchun012.replit.app';
}

function getWebhookUrl(): string {
  if (process.env.NODE_ENV === 'production' && process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    if (domains.length > 0) return `https://${domains[0]}/api/telegram/webhook`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/telegram/webhook`;
  }
  return 'https://fitboom--replituchun012.replit.app/api/telegram/webhook';
}

async function telegramApi(method: string, body: Record<string, any>) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram] Bot token not configured');
    return null;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`[Telegram] API error (${method}):`, data);
    }
    return data;
  } catch (error) {
    console.error(`[Telegram] Request failed (${method}):`, error);
    return null;
  }
}

async function sendMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return telegramApi('sendMessage', body);
}

async function sendPhoto(chatId: number | string, photoUrl: string, caption: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return telegramApi('sendPhoto', body);
}

async function copyMessage(chatId: number | string, fromChatId: number | string, messageId: number) {
  return telegramApi('copyMessage', { chat_id: chatId, from_chat_id: fromChatId, message_id: messageId });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

function getAdminChatIds(): string[] {
  const adminIds = process.env.ADMIN_IDS || '';
  return adminIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
}

function isAdmin(chatId: string): boolean {
  return getAdminChatIds().includes(chatId);
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function setupTelegramBot(app: Express, storage: IStorage) {
  setInterval(() => {
    storage.deleteExpiredLoginCodes().catch(err => {
      console.error('[Telegram] Error cleaning expired codes:', err);
    });
  }, 60 * 1000);

  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update: TelegramUpdate = req.body;
      console.log('[Telegram] Webhook update:', JSON.stringify(update).substring(0, 200));

      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query, storage);
        return res.sendStatus(200);
      }

      if (!update.message) {
        return res.sendStatus(200);
      }

      await handleMessage(update.message, storage);
      res.sendStatus(200);
    } catch (error) {
      console.error('[Telegram] Webhook error:', error);
      res.sendStatus(200);
    }
  });

  app.post('/api/telegram/verify-code', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: 'Kod talab qilinadi' });

      const upperCode = code.toUpperCase();
      const loginData = await storage.getLoginCodeByCode(upperCode);

      if (!loginData) {
        return res.status(400).json({ message: "Kod noto'g'ri yoki muddati o'tgan" });
      }

      if (new Date() > new Date(loginData.expiresAt)) {
        await storage.deleteLoginCode(upperCode);
        return res.status(400).json({ message: "Kod muddati o'tgan. Botdan yangi kod oling." });
      }

      if (loginData.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await storage.deleteLoginCode(upperCode);
        return res.status(400).json({ message: "Juda ko'p noto'g'ri urinishlar. Yangi kod oling." });
      }

      const user = await storage.getUserByTelegramId(loginData.telegramId);
      if (!user) {
        await storage.incrementLoginCodeAttempts(upperCode);
        return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
      }

      await storage.deleteLoginCode(upperCode);

      req.login(user as any, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Tizimga kirishda xatolik' });
        }
        res.json({ success: true, profileCompleted: user.profileCompleted, user });
      });
    } catch (error) {
      console.error('[Telegram] Verify code error:', error);
      res.status(500).json({ message: 'Server xatoligi' });
    }
  });
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery, storage: IStorage) {
  const data = callbackQuery.data || '';
  const chatId = callbackQuery.message?.chat.id.toString() || '';

  try {
    if (data.startsWith('pay_approve_')) {
      const paymentId = data.replace('pay_approve_', '');
      const payment = await storage.getCreditPayment(paymentId);
      if (payment && (payment.status === 'pending' || payment.status === 'partial')) {
        await storage.updateCreditPayment(paymentId, { status: 'approved', remainingAmount: 0 });
        const user = await storage.getUser(payment.userId);
        if (user) {
          await storage.updateUserCredits(user.id, user.credits + payment.credits);
          if (user.chatId) {
            await sendMessage(user.chatId,
              `<b>To'lovingiz tasdiqlandi!</b>\n\n` +
              `Hisobingizga ${payment.credits} ta kalit qo'shildi.\n` +
              `Hozirgi balansingiz: ${user.credits + payment.credits} ta kalit.`
            );
          }
        }
        await sendMessage(chatId, `To'lov tasdiqlandi (ID: ${paymentId})`);
      }
    } else if (data.startsWith('pay_reject_')) {
      const paymentId = data.replace('pay_reject_', '');
      const payment = await storage.getCreditPayment(paymentId);
      if (payment) {
        await storage.updateCreditPayment(paymentId, { status: 'rejected' });
        const user = await storage.getUser(payment.userId);
        if (user && user.chatId) {
          await sendMessage(user.chatId, `<b>Kechirasiz, to'lovingiz rad etildi.</b>\n\nIltimos, qaytadan urinib ko'ring.`);
        }
        await sendMessage(chatId, `To'lov rad etildi (ID: ${paymentId})`);
      }
    } else if (data.startsWith('pay_amount_')) {
      const paymentId = data.replace('pay_amount_', '');
      pendingAmountChanges.set(`amount_${chatId}`, paymentId);
      await sendMessage(chatId, 'Yangi summani kiriting (masalan: 150000):');
    }
    await answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    console.error('[Telegram] Callback error:', err);
    await answerCallbackQuery(callbackQuery.id, 'Xatolik yuz berdi');
  }
}

async function handleMessage(message: TelegramMessage, storage: IStorage) {
  const chatId = message.chat.id.toString();
  const telegramUserId = message.from.id.toString();

  if (adminBroadcastMode.has(chatId) && isAdmin(chatId)) {
    if (message.text === '/admin') {
      adminBroadcastMode.delete(chatId);
    } else {
      adminBroadcastMode.delete(chatId);
      const usersWithChat = await storage.getUsersWithChatId();
      const adminChatIds = getAdminChatIds();
      const recipients = usersWithChat.filter(u => u.chatId && !adminChatIds.includes(u.chatId));
      await sendMessage(chatId, `Reklama yuborilmoqda... (${recipients.length} ta foydalanuvchi)`);
      let sent = 0, failed = 0;
      for (const user of recipients) {
        try {
          const result = await copyMessage(user.chatId!, chatId, message.message_id);
          if (result?.ok) sent++; else failed++;
        } catch { failed++; }
        await new Promise(r => setTimeout(r, 50));
      }
      await sendMessage(chatId, `Reklama yuborildi!\n\nYuborildi: ${sent}\nXatolik: ${failed}\nJami: ${recipients.length}`);
    }
    return;
  }

  const pendingKey = `amount_${chatId}`;
  if (pendingAmountChanges.has(pendingKey) && message.text) {
    const paymentId = pendingAmountChanges.get(pendingKey)!;
    const newAmount = parseInt(message.text);
    if (!isNaN(newAmount)) {
      const payment = await storage.getCreditPayment(paymentId);
      if (payment) {
        const paidBefore = payment.price - payment.remainingAmount;
        const remainingAmount = Math.max(0, payment.price - (paidBefore + newAmount));
        await storage.updateCreditPayment(paymentId, {
          remainingAmount,
          status: remainingAmount === 0 ? 'approved' : 'partial',
        });
        pendingAmountChanges.delete(pendingKey);
        await sendMessage(chatId, `Muvaffaqiyatli o'zgartirildi!\n\nYangi kiritilgan: ${newAmount.toLocaleString()} so'm\nQoldiq: ${remainingAmount.toLocaleString()} so'm`);
        const user = await storage.getUser(payment.userId);
        if (remainingAmount === 0) {
          if (user) {
            await storage.updateUserCredits(user.id, user.credits + payment.credits);
            if (user.chatId) await sendMessage(user.chatId, `<b>To'lovingiz tasdiqlandi!</b>\n\nBalansingiz: ${user.credits + payment.credits} ta kalit.`);
          }
        } else {
          if (user && user.chatId) {
            await sendMessage(user.chatId,
              `<b>To'lovingiz qisman qabul qilindi.</b>\n\n` +
              `Siz ${newAmount.toLocaleString()} so'm to'ladingiz.\n` +
              `Qoldiq summa: <b>${remainingAmount.toLocaleString()} so'm</b>\n\n` +
              `Iltimos, qoldiq summani to'lab, chekni ilovadan yuboring.`
            );
          }
        }
      }
    } else {
      await sendMessage(chatId, "Iltimos, to'g'ri raqam kiriting.");
    }
    return;
  }

  if (message.text === '/admin' && isAdmin(chatId)) {
    const adminKeyboard = {
      keyboard: [
        [{ text: "Kutilayotgan to'lovlar" }],
        [{ text: 'Reklama yuborish' }],
      ],
      resize_keyboard: true,
    };
    await sendMessage(chatId, '<b>Admin panel</b>\n\nQuyidagi tugmalardan birini tanlang:', adminKeyboard);
    return;
  }

  if (isAdmin(chatId) && message.text === "Kutilayotgan to'lovlar") {
    const pendingPayments = await storage.getAllPendingCreditPayments();
    if (pendingPayments.length === 0) {
      await sendMessage(chatId, "Kutilayotgan to'lovlar yo'q.");
      return;
    }
    await sendMessage(chatId, `<b>Kutilayotgan to'lovlar: ${pendingPayments.length} ta</b>`);
    for (const payment of pendingPayments) {
      const user = await storage.getUser(payment.userId);
      const remaining = payment.remainingAmount > 0 ? payment.remainingAmount : payment.price;
      const text = `<b>${user?.name || "Noma'lum"}</b>\nTel: ${user?.phone || '-'}\nPaket: ${payment.credits} kalit\nNarx: ${payment.price.toLocaleString()} so'm\nQoldiq: ${remaining.toLocaleString()} so'm\nSana: ${new Date(payment.createdAt).toLocaleDateString('uz-UZ')}`;
      const buttons = {
        inline_keyboard: [
          [{ text: 'Tasdiqlash', callback_data: `pay_approve_${payment.id}` }, { text: 'Rad etish', callback_data: `pay_reject_${payment.id}` }],
          [{ text: "Summani o'zgartirish", callback_data: `pay_amount_${payment.id}` }]
        ]
      };
      await sendMessage(chatId, text, buttons);
    }
    return;
  }

  if (isAdmin(chatId) && message.text === 'Reklama yuborish') {
    adminBroadcastMode.set(chatId, true);
    await sendMessage(chatId, '<b>Reklama rejimi yoqildi!</b>\n\nKontent yuboring. Bekor qilish uchun /admin yuboring.');
    return;
  }

  if (message.text?.startsWith('/start')) {
    const existingUser = await storage.getUserByTelegramId(telegramUserId);
    if (existingUser && (!existingUser.chatId || existingUser.chatId !== chatId)) {
      await storage.updateUser(existingUser.id, { chatId });
    }
    const keyboard = {
      keyboard: [[{ text: 'Telefon raqamni ulashish', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
    await sendMessage(chatId, '<b>FitBoom ga xush kelibsiz!</b>\n\nTelefon raqamingizni ulashing:', keyboard);
    return;
  }

  if (message.contact) {
    const phoneNumber = message.contact.phone_number.startsWith('+')
      ? message.contact.phone_number
      : `+${message.contact.phone_number}`;

    const existingUser = await storage.getUserByPhone(phoneNumber);
    if (existingUser) await storage.updateUser(existingUser.id, { chatId });

    let user = await storage.getUserByTelegramId(telegramUserId);
    if (!user) user = await storage.createUser({ telegramId: telegramUserId, phone: phoneNumber });
    if (!user.chatId || user.chatId !== chatId) await storage.updateUser(user.id, { chatId });

    const lastCodeTime = await storage.getLastLoginCodeTime(telegramUserId);
    if (lastCodeTime) {
      const elapsed = Date.now() - new Date(lastCodeTime).getTime();
      if (elapsed < CODE_REQUEST_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((CODE_REQUEST_COOLDOWN_MS - elapsed) / 1000);
        await sendMessage(chatId, `Iltimos, ${waitSeconds} soniya kuting va qayta urinib ko'ring.`);
        return;
      }
    }

    const loginCode = generateCode();
    await storage.createLoginCode({
      code: loginCode,
      telegramId: telegramUserId,
      chatId,
      phone: phoneNumber,
      attempts: 0,
      expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
    });

    const appUrl = getAppUrl();
    const welcomeText = user.profileCompleted
      ? '<b>Xush kelibsiz!</b>\n\n'
      : "<b>Tabriklaymiz!</b>\n\nRo'yxatdan o'tdingiz!\n\n";

    const inlineKeyboard = {
      inline_keyboard: [[{ text: 'Ilovaga qaytish', url: `${appUrl}/telegram-login` }]],
    };
    await sendMessage(chatId, welcomeText + `Kodni kiriting:\n\n<code>${loginCode}</code>`, inlineKeyboard);
    return;
  }
}

export async function setupTelegramWebhook() {
  const webhookUrl = getWebhookUrl();
  console.log(`[Telegram] Setting webhook to: ${webhookUrl}`);
  const result = await telegramApi('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
  });
  if (result?.ok) {
    console.log('[Telegram] Webhook set successfully');
  } else {
    console.error('[Telegram] Failed to set webhook:', result);
  }
  return result;
}

export async function notifyProfileCompleted(user: any) {
  if (!user?.chatId) return;
  try {
    await sendMessage(user.chatId, `<b>Tabriklaymiz!</b>\n\nProfilingiz to'ldirildi!`);
  } catch (error) {
    console.error('[Telegram] Notify error:', error);
  }
}

export async function sendPaymentReceiptToAdmin(storage: IStorage, paymentId: string, receiptUrl: string, user: any, credits: number, price: number, isRemainingPayment: boolean = false) {
  const payment = await storage.getCreditPayment(paymentId);
  const remainingAmount = payment?.remainingAmount || 0;
  
  let caption: string;
  if (isRemainingPayment) {
    caption = `<b>Qoldiq to'lov cheki!</b>\n\nMijoz: ${user.name}\nTel: ${user.phone}\nPaket: ${credits} kalit\nQoldiq summa: ${remainingAmount.toLocaleString()} so'm`;
  } else {
    caption = `<b>Yangi to'lov!</b>\n\nMijoz: ${user.name}\nTel: ${user.phone}\nPaket: ${credits} kalit\nSumma: ${price.toLocaleString()} so'm`;
  }
  const inlineKeyboard = {
    inline_keyboard: [
      [{ text: 'Tasdiqlash', callback_data: `pay_approve_${paymentId}` }, { text: 'Rad etish', callback_data: `pay_reject_${paymentId}` }],
      [{ text: "Summani o'zgartirish", callback_data: `pay_amount_${paymentId}` }]
    ]
  };
  const adminIds = getAdminChatIds();
  for (const adminId of adminIds) {
    await sendPhoto(adminId, receiptUrl, caption, inlineKeyboard);
  }
}
