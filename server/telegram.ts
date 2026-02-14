import type { Express } from 'express';
import type { IStorage } from './storage';

const TELEGRAM_BOT_TOKEN = "8525615025:AAGVyfcMWf65ocmimVYl5LbXKXadCyT6X5M";
const TELEGRAM_BOT_USERNAME = "Fitboom_bot"; 

interface LoginCodeData {
  telegramId: string;
  chatId: string;
  phone: string;
  expiresAt: number;
  attempts: number;
}

const loginCodes = new Map<string, LoginCodeData>();
const userLastCodeTime = new Map<string, number>();

const CODE_EXPIRY_MS = 5 * 60 * 1000;
const CODE_REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 3;

setInterval(() => {
  const now = Date.now();
  const expiredCodes: string[] = [];
  loginCodes.forEach((data, code) => {
    if (data.expiresAt < now) {
      expiredCodes.push(code);
    }
  });
  expiredCodes.forEach(code => loginCodes.delete(code));
  
  const expiredUsers: string[] = [];
  userLastCodeTime.forEach((time, userId) => {
    if (now - time > CODE_REQUEST_COOLDOWN_MS) {
      expiredUsers.push(userId);
    }
  });
  expiredUsers.forEach(userId => userLastCodeTime.delete(userId));
}, 60 * 1000);

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
  chat: {
    id: number;
    type: string;
  };
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

const APP_URL = "https://fitboom--replituchun012.replit.app";

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('Telegram API error:', data);
    }
    return data;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return null;
  }
}

async function sendTelegramPhoto(chatId: number | string, photoUrl: string, caption: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  
  const body: any = {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: 'HTML',
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('Telegram API sendPhoto error:', data);
    }
    return data;
  } catch (error) {
    console.error('Error sending Telegram photo:', error);
    return null;
  }
}

async function copyMessage(chatId: number | string, fromChatId: number | string, messageId: number) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/copyMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        from_chat_id: fromChatId,
        message_id: messageId,
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error copying Telegram message:', error);
    return null;
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    });
  } catch (error) {
    console.error('Error answering callback query:', error);
  }
}

const ADMIN_PANEL_CHAT_ID = 5304482470;

export function setupTelegramBot(app: Express, storage: IStorage) {
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update: TelegramUpdate = req.body;
      console.log('[Telegram] Webhook received update:', JSON.stringify(update));

      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const data = callbackQuery.data || '';
        const chatId = callbackQuery.message?.chat.id.toString() || '';
        const messageId = callbackQuery.message?.message_id;

        try {
          if (data.startsWith('pay_approve_')) {
            const paymentId = data.replace('pay_approve_', '');
            const payment = await storage.getCreditPayment(paymentId);
            if (payment && payment.status === 'pending') {
              await storage.updateCreditPayment(paymentId, { status: 'approved' });
              const user = await storage.getUser(payment.userId);
              if (user) {
                await storage.updateUserCredits(user.id, user.credits + payment.credits);
                if (user.chatId) {
                  await sendTelegramMessage(user.chatId, 
                    `<b>To'lovingiz tasdiqlandi!</b>\n\n` +
                    `Hisobingizga ${payment.credits} ta kalit qo'shildi.\n` +
                    `Hozirgi balansingiz: ${user.credits + payment.credits} ta kalit.`
                  );
                }
              }
              await sendTelegramMessage(chatId, `To'lov tasdiqlandi (ID: ${paymentId})`);
            }
          } else if (data.startsWith('pay_reject_')) {
            const paymentId = data.replace('pay_reject_', '');
            const payment = await storage.getCreditPayment(paymentId);
            if (payment) {
              await storage.updateCreditPayment(paymentId, { status: 'rejected' });
              const user = await storage.getUser(payment.userId);
              if (user && user.chatId) {
                await sendTelegramMessage(user.chatId, `<b>Kechirasiz, to'lovingiz rad etildi.</b>\n\nIltimos, qaytadan urinib ko'ring yoki qo'llab-quvvatlash xizmatiga murojaat qiling.`);
              }
              await sendTelegramMessage(chatId, `To'lov rad etildi (ID: ${paymentId})`);
            }
          } else if (data.startsWith('pay_amount_')) {
            const paymentId = data.replace('pay_amount_', '');
            pendingAmountChanges.set(`amount_${chatId}`, paymentId);
            await sendTelegramMessage(chatId, 'Yangi summani kiriting (masalan: 150000):');
          }
          await answerCallbackQuery(callbackQuery.id);
        } catch (err) {
          console.error('[Telegram] Error processing callback:', err);
          await answerCallbackQuery(callbackQuery.id, 'Xatolik yuz berdi');
        }
        return res.sendStatus(200);
      }
      
      if (!update.message) {
        return res.sendStatus(200);
      }

      const message = update.message;
      const chatId = message.chat.id.toString();
      const telegramUserId = message.from.id.toString();

      if (adminBroadcastMode.has(chatId) && chatId === ADMIN_PANEL_CHAT_ID.toString()) {
        if (message.text === '/admin') {
          adminBroadcastMode.delete(chatId);
        } else {
          adminBroadcastMode.delete(chatId);
          const usersWithChat = await storage.getUsersWithChatId();
          let sent = 0;
          let failed = 0;
          await sendTelegramMessage(chatId, `Reklama yuborilmoqda... (${usersWithChat.length} ta foydalanuvchi)`);
          for (const user of usersWithChat) {
            if (user.chatId && user.chatId !== ADMIN_PANEL_CHAT_ID.toString()) {
              try {
                const result = await copyMessage(user.chatId, chatId, message.message_id);
                if (result?.ok) sent++; else failed++;
              } catch { failed++; }
              await new Promise(r => setTimeout(r, 50));
            }
          }
          await sendTelegramMessage(chatId, `Reklama yuborildi!\n\nYuborildi: ${sent}\nXatolik: ${failed}\nJami: ${usersWithChat.length}`);
        }
        return res.sendStatus(200);
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
            await sendTelegramMessage(chatId, `Muvaffaqiyatli o'zgartirildi!\n\nYangi kiritilgan: ${newAmount.toLocaleString()} so'm\nQoldiq: ${remainingAmount.toLocaleString()} so'm`);
            if (remainingAmount === 0) {
              const user = await storage.getUser(payment.userId);
              if (user) {
                await storage.updateUserCredits(user.id, user.credits + payment.credits);
                if (user.chatId) await sendTelegramMessage(user.chatId, `To'lovingiz tasdiqlandi! Balansingiz: ${user.credits + payment.credits} ta kalit.`);
              }
            }
          }
        } else {
          await sendTelegramMessage(chatId, 'Iltimos, to\'g\'ri raqam kiriting.');
        }
        return res.sendStatus(200);
      }

      if (message.text === '/admin' && chatId === ADMIN_PANEL_CHAT_ID.toString()) {
        const adminKeyboard = {
          keyboard: [[{ text: 'Kutilayotgan to\'lovlar' }, { text: 'Reklama yuborish' }]],
          resize_keyboard: true,
        };
        await sendTelegramMessage(chatId, '<b>Admin panel</b>\n\nQuyidagi tugmalardan birini tanlang:', adminKeyboard);
        return res.sendStatus(200);
      }

      if (chatId === ADMIN_PANEL_CHAT_ID.toString() && message.text === 'Kutilayotgan to\'lovlar') {
        const pendingPayments = await storage.getAllPendingCreditPayments();
        if (pendingPayments.length === 0) {
          await sendTelegramMessage(chatId, 'Kutilayotgan to\'lovlar yo\'q.');
          return res.sendStatus(200);
        }
        await sendTelegramMessage(chatId, `<b>Kutilayotgan to'lovlar: ${pendingPayments.length} ta</b>`);
        for (const payment of pendingPayments) {
          const user = await storage.getUser(payment.userId);
          const statusText = payment.status === 'partial' ? 'Qisman' : 'Kutilmoqda';
          const remaining = payment.remainingAmount > 0 ? payment.remainingAmount : payment.price;
          let text = `<b>${user?.name || 'Noma\'lum'}</b>\nTel: ${user?.phone || '-'}\nPaket: ${payment.credits} kalit\nNarx: ${payment.price.toLocaleString()} so'm\nQoldiq: ${remaining.toLocaleString()} so'm\nSana: ${new Date(payment.createdAt).toLocaleDateString('uz-UZ')}`;
          const buttons = { inline_keyboard: [[{ text: 'Tasdiqlash', callback_data: `pay_approve_${payment.id}` }, { text: 'Rad etish', callback_data: `pay_reject_${payment.id}` }], [{ text: 'Summani o\'zgartirish', callback_data: `pay_amount_${payment.id}` }]] };
          await sendTelegramMessage(chatId, text, buttons);
        }
        return res.sendStatus(200);
      }

      if (chatId === ADMIN_PANEL_CHAT_ID.toString() && message.text === 'Reklama yuborish') {
        adminBroadcastMode.set(chatId, true);
        await sendTelegramMessage(chatId, '<b>Reklama rejimi yoqildi!</b>\n\nKontent yuboring. Bekor qilish uchun /admin yuboring.');
        return res.sendStatus(200);
      }

      if (message.text?.startsWith('/start')) {
        const keyboard = { keyboard: [[{ text: 'Telefon raqamni ulashish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
        await sendTelegramMessage(chatId, '<b>FitBoom ga xush kelibsiz!</b>\n\nTelefon raqamingizni ulashing:', keyboard);
      } else if (message.contact) {
        const phoneNumber = message.contact.phone_number.startsWith('+') ? message.contact.phone_number : `+${message.contact.phone_number}`;
        const existingUser = await storage.getUserByPhone(phoneNumber);
        if (existingUser) await storage.updateUser(existingUser.id, { chatId });
        
        let user = await storage.getUserByTelegramId(telegramUserId);
        if (!user) user = await storage.createUser({ telegramId: telegramUserId, phone: phoneNumber });
        if (!user.chatId || user.chatId !== chatId) await storage.updateUser(user.id, { chatId });

        const loginCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        loginCodes.set(loginCode, { telegramId: telegramUserId, chatId, phone: phoneNumber, expiresAt: Date.now() + CODE_EXPIRY_MS, attempts: 0 });
        userLastCodeTime.set(telegramUserId, Date.now());

        const welcomeText = user.profileCompleted ? '<b>Xush kelibsiz!</b>\n\n' : '<b>Tabriklaymiz!</b>\n\nRo\'yxatdan o\'tdingiz!\n\n';
        const inlineKeyboard = { inline_keyboard: [[{ text: 'Ilovaga qaytish', url: `${APP_URL}/telegram-login` }]] };
        await sendTelegramMessage(chatId, welcomeText + `Kodni kiriting:\n\n<code>${loginCode}</code>`, inlineKeyboard);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error('Telegram webhook error:', error);
      res.sendStatus(500);
    }
  });

  app.post('/api/telegram/verify-code', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: 'Kod talab qilinadi' });
      const loginData = loginCodes.get(code.toUpperCase());
      if (!loginData) return res.status(400).json({ message: 'Kod noto\'g\'ri yoki muddati o\'tgan' });
      const user = await storage.getUserByTelegramId(loginData.telegramId);
      if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
      loginCodes.delete(code.toUpperCase());
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: 'Tizimga kirishda xatolik' });
        res.json(user);
      });
    } catch (error) { res.status(500).json({ message: 'Server xatoligi' }); }
  });
}

export async function notifyProfileCompletion(storage: IStorage, userId: string) {
  const user = await storage.getUser(userId);
  if (!user || !user.chatId) return;
  try {
    await sendTelegramMessage(user.chatId, `<b>Tabriklaymiz!</b>\n\nProfilingiz to'ldirildi!`);
  } catch (error) { console.error('[Telegram] Error:', error); }
}

export async function setupTelegramWebhook(webhookUrl: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] }) });
    return await response.json();
  } catch (error) { return null; }
}

export async function sendPaymentReceiptToAdmin(storage: IStorage, paymentId: string, receiptUrl: string, user: any, credits: number, price: number) {
  const caption = `<b>Yangi to'lov!</b>\n\nMijoz: ${user.name}\nTel: ${user.phone}\nPaket: ${credits} kalit\nSumma: ${price.toLocaleString()} so'm`;
  const inlineKeyboard = { inline_keyboard: [[{ text: 'Tasdiqlash', callback_data: `pay_approve_${paymentId}` }, { text: 'Rad etish', callback_data: `pay_reject_${paymentId}` }], [{ text: 'Summani o\'zgartirish', callback_data: `pay_amount_${paymentId}` }]] };
  return await sendTelegramPhoto(ADMIN_PANEL_CHAT_ID, receiptUrl, caption, inlineKeyboard);
}
