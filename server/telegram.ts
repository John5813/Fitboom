import type { Express } from 'express';
import type { IStorage } from './storage';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

interface LoginCodeData {
  telegramId: string;
  chatId: number;
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

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
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

async function sendTelegramPhoto(chatId: number, photoUrl: string, caption: string, replyMarkup?: any) {
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
    console.log('[Telegram] sendPhoto result:', JSON.stringify(data));
    if (!response.ok) {
      console.error('Telegram API sendPhoto error:', data);
    }
    return data;
  } catch (error) {
    console.error('Error sending Telegram photo:', error);
    return null;
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || '' }),
    });
  } catch (error) {
    console.error('Error answering callback query:', error);
  }
}

async function editMessageReplyMarkup(chatId: number, messageId: number, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup || { inline_keyboard: [] },
      }),
    });
  } catch (error) {
    console.error('Error editing message markup:', error);
  }
}

export function setupTelegramWebhook(app: Express, storage: IStorage) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot credentials not configured. Skipping webhook setup.');
    return;
  }

  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update: TelegramUpdate = req.body;

      if (update.callback_query) {
        console.log('[Telegram] Callback query received:', update.callback_query.data);
        await handleCallbackQuery(update.callback_query, storage);
        return res.sendStatus(200);
      }
      
      if (!update.message) {
        return res.sendStatus(200);
      }

      const message = update.message;
      const chatId = message.chat.id;
      const telegramUserId = message.from.id.toString();

      const pendingKey = `amount_${chatId}`;
      if (pendingAmountChanges.has(pendingKey) && message.text) {
        const paymentId = pendingAmountChanges.get(pendingKey)!;
        const newAmount = parseInt(message.text);
        
        if (!isNaN(newAmount) && newAmount > 0) {
          pendingAmountChanges.delete(pendingKey);
          
          const payment = await storage.getCreditPayment(paymentId);
          if (payment) {
            const remainingAmount = payment.price - newAmount;
            if (remainingAmount <= 0) {
              await sendTelegramMessage(chatId, 'Kiritilgan summa asl narxdan kam bo\'lishi kerak. To\'liq tasdiqlash uchun "Tasdiqlash" tugmasini bosing.');
            } else {
              await storage.updateCreditPayment(paymentId, { 
                status: 'partial',
                remainingAmount: remainingAmount,
              } as any);

              const user = await storage.getUser(payment.userId);
              if (user?.chatId) {
                await sendTelegramMessage(
                  user.chatId,
                  `To'lovingiz qisman qabul qilindi.\n\n` +
                  `To'langan summa: ${newAmount.toLocaleString()} so'm\n` +
                  `<b>Qoldiq summa: ${remainingAmount.toLocaleString()} so'm</b>\n\n` +
                  `Iltimos, qoldiq summani to'lab, chekni ilovada yuboring.`
                );
              }

              await sendTelegramMessage(
                chatId,
                `Miqdor o'zgartirildi.\n\n` +
                `To'langan: ${newAmount.toLocaleString()} so'm\n` +
                `Asl narx: ${payment.price.toLocaleString()} so'm\n` +
                `Qoldiq: ${remainingAmount.toLocaleString()} so'm\n\n` +
                `Mijoz qoldiqni to'lagandan so'ng tasdiqlang.`
              );
            }
          }
        } else {
          await sendTelegramMessage(chatId, 'Iltimos, to\'g\'ri raqam kiriting (masalan: 150000)');
        }
        return res.sendStatus(200);
      }

      if (message.text?.startsWith('/start')) {
        const keyboard = {
          keyboard: [
            [{ text: '📱 Telefon raqamni ulashish', request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

        await sendTelegramMessage(
          chatId,
          '🏋️ <b>FitBoom ga xush kelibsiz!</b>\n\n' +
          'Ro\'yxatdan o\'tish uchun telefon raqamingizni ulashing.\n\n' +
          'Quyidagi tugmani bosing:',
          keyboard
        );
      } else if (message.contact) {
        const contact = message.contact;
        const phoneNumber = contact.phone_number.startsWith('+') 
          ? contact.phone_number 
          : `+${contact.phone_number}`;

        const lastCodeTime = userLastCodeTime.get(telegramUserId);
        if (lastCodeTime && Date.now() - lastCodeTime < CODE_REQUEST_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((CODE_REQUEST_COOLDOWN_MS - (Date.now() - lastCodeTime)) / 1000);
          await sendTelegramMessage(
            chatId,
            `⏳ Iltimos kuting!\n\nYangi kod olish uchun ${remainingSeconds} soniya kutishingiz kerak.`
          );
          return res.sendStatus(200);
        }

        let user = await storage.getUserByTelegramId(telegramUserId);
        
        if (!user) {
          user = await storage.createUser({
            telegramId: telegramUserId,
            phone: phoneNumber,
          });
        }

        const loginCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        loginCodes.set(loginCode, {
          telegramId: telegramUserId,
          chatId,
          phone: phoneNumber,
          expiresAt: Date.now() + CODE_EXPIRY_MS,
          attempts: 0,
        });

        userLastCodeTime.set(telegramUserId, Date.now());

        const welcomeText = user.profileCompleted
          ? '👋 <b>Xush kelibsiz!</b>\n\n'
          : '✅ <b>Tabriklaymiz!</b>\n\n' + 'Siz muvaffaqiyatli ro\'yxatdan o\'tdingiz!\n\n';

        await sendTelegramMessage(
          chatId,
          welcomeText +
          `Ilovaga qayting va bu kodni kiriting:\n\n<code>${loginCode}</code>\n\n` +
          '<b>Diqqat:</b>\n' +
          '• Kod 5 daqiqa amal qiladi\n' +
          '• Bu kodni hech kimga bermang!\n' +
          '• Faqat 3 marta urinish huquqingiz bor'
        );

        console.log(`[Telegram Auth] Code generated for user ${telegramUserId}: ${loginCode}`);
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
      
      if (!code) {
        return res.status(400).json({ message: 'Kod talab qilinadi' });
      }

      const codeKey = code.toUpperCase();
      const loginData = loginCodes.get(codeKey);
      
      if (!loginData) {
        console.log(`[Telegram Auth] Invalid code attempt: ${codeKey}`);
        return res.status(400).json({ message: 'Kod noto\'g\'ri yoki muddati o\'tgan' });
      }

      if (loginData.expiresAt < Date.now()) {
        loginCodes.delete(codeKey);
        console.log(`[Telegram Auth] Expired code: ${codeKey}`);
        return res.status(400).json({ message: 'Kod muddati o\'tgan' });
      }

      loginData.attempts++;
      
      if (loginData.attempts > MAX_VERIFICATION_ATTEMPTS) {
        loginCodes.delete(codeKey);
        console.log(`[Telegram Auth] Too many attempts for code: ${codeKey}`);
        return res.status(400).json({ message: 'Juda ko\'p urinish. Yangi kod oling.' });
      }

      const user = await storage.getUserByTelegramId(loginData.telegramId);
      
      if (!user) {
        loginCodes.delete(codeKey);
        console.log(`[Telegram Auth] User not found for telegramId: ${loginData.telegramId}`);
        return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
      }

      if (user.phone !== loginData.phone) {
        loginCodes.delete(codeKey);
        console.log(`[Telegram Auth] Phone mismatch for code: ${codeKey}`);
        return res.status(400).json({ message: 'Xavfsizlik xatosi. Qaytadan urinib ko\'ring.' });
      }

      loginCodes.delete(codeKey);
      console.log(`[Telegram Auth] Successful login for user: ${user.id}`);

      (req as any).login(user, (err: any) => {
        if (err) {
          console.error('[Telegram Auth] Login error:', err);
          return res.status(500).json({ message: 'Tizimga kirish xatosi' });
        }
        res.json({ 
          success: true, 
          user,
          profileCompleted: user.profileCompleted 
        });
      });
    } catch (error) {
      console.error('[Telegram Auth] Verify code error:', error);
      res.status(500).json({ message: 'Server xatosi' });
    }
  });
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery, storage: IStorage) {
  const data = callbackQuery.data;
  if (!data) return;

  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  
  if (!chatId || !messageId) return;

  if (data.startsWith('pay_approve_')) {
    const paymentId = data.replace('pay_approve_', '');
    const payment = await storage.getCreditPayment(paymentId);
    
    if (!payment) {
      await answerCallbackQuery(callbackQuery.id, 'To\'lov topilmadi');
      return;
    }

    const user = await storage.getUser(payment.userId);
    if (!user) {
      await answerCallbackQuery(callbackQuery.id, 'Foydalanuvchi topilmadi');
      return;
    }

    const newCredits = user.credits + payment.credits;
    
    let expiryDate: Date;
    const now = new Date();
    if (user.creditExpiryDate && new Date(user.creditExpiryDate) > now) {
      expiryDate = new Date(user.creditExpiryDate);
    } else {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
    }
    
    await storage.updateUserCreditsWithExpiry(user.id, newCredits, expiryDate);
    await storage.updateCreditPayment(paymentId, { status: 'approved' } as any);

    await editMessageReplyMarkup(chatId, messageId);
    await sendTelegramMessage(chatId, 
      `Tasdiqlandi!\n\n` +
      `${user.name || 'Foydalanuvchi'} ga ${payment.credits} kalit qo'shildi.\n` +
      `Yangi balans: ${newCredits} kalit`
    );

    if (user.chatId) {
      await sendTelegramMessage(user.chatId,
        `Sizning to'lovingiz tasdiqlandi!\n\n` +
        `${payment.credits} kalit hisobingizga qo'shildi.\n` +
        `Yangi balans: ${newCredits} kalit`
      );
    }

    await answerCallbackQuery(callbackQuery.id, 'Tasdiqlandi');
  }
  else if (data.startsWith('pay_reject_')) {
    const paymentId = data.replace('pay_reject_', '');
    const payment = await storage.getCreditPayment(paymentId);
    
    if (!payment) {
      await answerCallbackQuery(callbackQuery.id, 'To\'lov topilmadi');
      return;
    }

    await storage.updateCreditPayment(paymentId, { status: 'rejected' } as any);
    
    await editMessageReplyMarkup(chatId, messageId);
    await sendTelegramMessage(chatId, `To'lov rad etildi.`);

    const user = await storage.getUser(payment.userId);
    if (user?.chatId) {
      await sendTelegramMessage(user.chatId,
        `Sizning to'lovingiz rad etildi.\n\n` +
        `Iltimos, to'g'ri chek yuborishga harakat qiling yoki qo'llab-quvvatlash xizmatiga murojaat qiling.`
      );
    }

    await answerCallbackQuery(callbackQuery.id, 'Rad etildi');
  }
  else if (data.startsWith('pay_change_')) {
    const paymentId = data.replace('pay_change_', '');
    
    pendingAmountChanges.set(`amount_${chatId}`, paymentId);
    
    await sendTelegramMessage(chatId, 
      `Yangi summani kiriting (so'mda):\n\n` +
      `Masalan: 150000`
    );

    await answerCallbackQuery(callbackQuery.id, 'Yangi summani kiriting');
  }
}

const ADMIN_PANEL_CHAT_ID = 5304482470;

export async function sendPaymentReceiptToAdmin(
  storage: IStorage,
  paymentId: string,
  receiptUrl: string,
  user: any,
  credits: number,
  price: number
) {
  const caption = 
    `<b>Yangi to'lov!</b>\n\n` +
    `Mijoz: ${user.name || 'Noma\'lum'}\n` +
    `Telefon: ${user.phone || 'Noma\'lum'}\n` +
    `Telegram: ${user.telegramId || 'Noma\'lum'}\n` +
    `Paket: ${credits} kalit\n` +
    `Summa: ${price.toLocaleString()} so'm\n` +
    `To'lov ID: ${paymentId}`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: 'Tasdiqlash', callback_data: `pay_approve_${paymentId}` },
        { text: 'Rad etish', callback_data: `pay_reject_${paymentId}` },
      ],
      [
        { text: 'Miqdorni o\'zgartirish', callback_data: `pay_change_${paymentId}` },
      ],
    ],
  };

  const result = await sendTelegramPhoto(ADMIN_PANEL_CHAT_ID, receiptUrl, caption, inlineKeyboard);
  if (result?.ok && result.result?.message_id) {
    await storage.updateCreditPayment(paymentId, {
      telegramMessageId: result.result.message_id,
      adminChatId: String(ADMIN_PANEL_CHAT_ID),
    } as any);
  }
}

export async function notifyProfileCompleted(user: any) {
  if (!user.telegramId || !user.chatId) {
    console.log(`[Telegram] No Telegram ID or chat ID for user ${user.id}`);
    return;
  }

  try {
    const message = 
      `<b>Tabriklaymiz!</b>\n\n` +
      `Profilingiz muvaffaqiyatli to'ldirildi:\n\n` +
      `Ism: ${user.name}\n` +
      `Telefon: ${user.phone}\n` +
      `Yosh: ${user.age}\n` +
      `Jins: ${user.gender === 'male' ? 'Erkak' : 'Ayol'}\n\n` +
      `Endi siz barcha xizmatlardan foydalanishingiz mumkin!`;

    await sendTelegramMessage(user.chatId, message);
    console.log(`[Telegram] Profile completion notification sent to ${user.telegramId}`);
  } catch (error) {
    console.error('[Telegram] Error sending profile completion notification:', error);
  }
}

export async function setTelegramWebhook(webhookUrl: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not set. Skipping webhook registration.');
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"]
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('Telegram webhook set successfully:', webhookUrl);
    } else {
      console.error('Failed to set Telegram webhook:', data);
    }
    
    return data;
  } catch (error) {
    console.error('Error setting Telegram webhook:', error);
    return null;
  }
}
