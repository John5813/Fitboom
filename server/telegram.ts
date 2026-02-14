import type { Express } from 'express';
import type { IStorage } from './storage';

const TELEGRAM_BOT_TOKEN = "8525615025:AAGVyfcMWf65ocmimVYl5LbXKXadCyT6X5M";
const TELEGRAM_BOT_USERNAME = "Fitboom_bot"; // Taxminiy username, foydalanuvchi keyinroq to'g'irlashi mumkin

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
const adminBroadcastMode = new Map<number, boolean>();

const APP_URL = "https://fitboom--replituchun012.replit.app";

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

async function copyMessage(fromChatId: number, messageId: number, toChatId: number) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/copyMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: toChatId,
        from_chat_id: fromChatId,
        message_id: messageId,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error copying message to ${toChatId}:`, error);
    return null;
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
      console.log('[Telegram] Webhook received update:', JSON.stringify(update).slice(0, 300));

      if (update.callback_query) {
        console.log('[Telegram] Callback query received:', update.callback_query.data, 'from chat:', update.callback_query.message?.chat.id);
        try {
          await handleCallbackQuery(update.callback_query, storage);
          console.log('[Telegram] Callback query processed successfully:', update.callback_query.data);
        } catch (callbackError) {
          console.error('[Telegram] Error processing callback query:', callbackError);
          try {
            await answerCallbackQuery(update.callback_query.id, 'Xatolik yuz berdi');
          } catch (answerError) {
            console.error('[Telegram] Error answering callback query:', answerError);
          }
        }
        return res.sendStatus(200);
      }
      
      if (!update.message) {
        return res.sendStatus(200);
      }

      const message = update.message;
      const chatId = message.chat.id;
      const telegramUserId = message.from.id.toString();

      if (adminBroadcastMode.has(chatId) && chatId === ADMIN_PANEL_CHAT_ID) {
        if (message.text === '/admin') {
          adminBroadcastMode.delete(chatId);
        } else {
        adminBroadcastMode.delete(chatId);
        
        const usersWithChat = await storage.getUsersWithChatId();
        let sent = 0;
        let failed = 0;
        
        await sendTelegramMessage(chatId, `Reklama yuborilmoqda... (${usersWithChat.length} ta foydalanuvchi)`);
        
        for (const user of usersWithChat) {
          if (user.chatId && user.chatId !== ADMIN_PANEL_CHAT_ID) {
            try {
              const result = await copyMessage(chatId, message.message_id, user.chatId);
              if (result?.ok) {
                sent++;
              } else {
                failed++;
              }
            } catch {
              failed++;
            }
            await new Promise(r => setTimeout(r, 50));
          }
        }
        
        await sendTelegramMessage(chatId, 
          `Reklama yuborildi!\n\n` +
          `Yuborildi: ${sent}\n` +
          `Xatolik: ${failed}\n` +
          `Jami: ${usersWithChat.length}`
        );
        }
        return res.sendStatus(200);
      }

      const pendingKey = `amount_${chatId}`;
      if (pendingAmountChanges.has(pendingKey) && message.text) {
        const paymentId = pendingAmountChanges.get(pendingKey)!;
        const newAmount = parseInt(message.text);
        
        if (!isNaN(newAmount) && newAmount > 0) {
          pendingAmountChanges.delete(pendingKey);
          
          const payment = await storage.getCreditPayment(paymentId);
          if (payment) {
            const currentRemaining = payment.remainingAmount > 0 ? payment.remainingAmount : payment.price;
            const remainingAmount = currentRemaining - newAmount;
            if (remainingAmount < 0) {
              await sendTelegramMessage(chatId, `Kiritilgan summa qoldiqdan ko'p (${currentRemaining.toLocaleString()} so'm). Iltimos, to'g'ri summani kiriting.`);
            } else {
              await storage.updateCreditPayment(paymentId, { 
                status: remainingAmount === 0 ? 'approved' : 'partial',
                remainingAmount: remainingAmount,
              } as any);

              const user = await storage.getUser(payment.userId);
              if (!user) return;
              
              if (remainingAmount === 0) {
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
                
                await sendTelegramMessage(chatId, 
                  `To'lov to'liq yakunlandi!\n\n` +
                  `${user.name || 'Foydalanuvchi'} ga ${payment.credits} kalit qo'shildi.\n` +
                  `Yangi balans: ${newCredits} kalit`
                );
                
                if (user.chatId) {
                  await sendTelegramMessage(user.chatId,
                    `To'lovingiz to'liq tasdiqlandi!\n\n` +
                    `${payment.credits} kalit hisobingizga qo'shildi.\n` +
                    `Yangi balans: ${newCredits} kalit`
                  );
                }
              } else {
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
                  `Miqdor ayirildi.\n\n` +
                  `Ayirilgan summa: ${newAmount.toLocaleString()} so'm\n` +
                  `Asl narx: ${payment.price.toLocaleString()} so'm\n` +
                  `<b>Yangi qoldiq: ${remainingAmount.toLocaleString()} so'm</b>\n\n` +
                  `Mijoz yana to'lov qilsa, miqdorni o'zgartirishni davom ettiring.`
                );
              }
            }
          }
        } else {
          await sendTelegramMessage(chatId, 'Iltimos, to\'g\'ri raqam kiriting (masalan: 150000)');
        }
        return res.sendStatus(200);
      }

      if (message.text === '/admin' && chatId === ADMIN_PANEL_CHAT_ID) {
        const adminKeyboard = {
          keyboard: [
            [{ text: 'Kutilayotgan to\'lovlar' }, { text: 'Reklama yuborish' }],
          ],
          resize_keyboard: true,
        };
        await sendTelegramMessage(
          chatId,
          '<b>Admin panel</b>\n\nQuyidagi tugmalardan birini tanlang:',
          adminKeyboard
        );
        return res.sendStatus(200);
      }

      if (chatId === ADMIN_PANEL_CHAT_ID && message.text === 'Kutilayotgan to\'lovlar') {
        try {
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
            
            let text = `<b>${user?.name || 'Noma\'lum'}</b>\n`;
            text += `Tel: ${user?.phone || '-'}\n`;
            text += `Paket: ${payment.credits} kalit\n`;
            text += `Narx: ${payment.price.toLocaleString()} so'm\n`;
            if (payment.status === 'partial') {
              text += `Qoldiq: ${remaining.toLocaleString()} so'm\n`;
            }
            text += `Holat: ${statusText}\n`;
            text += `Sana: ${new Date(payment.createdAt).toLocaleDateString('uz-UZ')}`;

            const buttons = {
              inline_keyboard: [
                [
                  { text: 'Tasdiqlash', callback_data: `pay_approve_${payment.id}` },
                  { text: 'Rad etish', callback_data: `pay_reject_${payment.id}` },
                ],
                [
                  { text: 'Summani o\'zgartirish', callback_data: `pay_amount_${payment.id}` },
                ],
              ],
            };

            await sendTelegramMessage(chatId, text, buttons);
          }
        } catch (err) {
          console.error(`[Admin] Error fetching pending payments:`, err);
          await sendTelegramMessage(chatId, 'Xatolik yuz berdi.');
        }
        return res.sendStatus(200);
      }

      if (chatId === ADMIN_PANEL_CHAT_ID && message.text === 'Reklama yuborish') {
        adminBroadcastMode.set(chatId, true);
        await sendTelegramMessage(chatId, 
          '<b>Reklama rejimi yoqildi!</b>\n\n' +
          'Endi kerakli kontentni yuboring:\n' +
          '- Matn\n' +
          '- Rasm\n' +
          '- Video\n' +
          '- Fayl\n' +
          '- Havolalar\n\n' +
          'Bekor qilish uchun /admin yuboring.'
        );
        return res.sendStatus(200);
      }

      if (message.text?.startsWith('/start')) {
        const keyboard = {
          keyboard: [
            [{ text: 'Telefon raqamni ulashish', request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

        await sendTelegramMessage(
          chatId,
          '<b>FitBoom ga xush kelibsiz!</b>\n\n' +
          'Ro\'yxatdan o\'tish uchun telefon raqamingizni ulashing.\n\n' +
          'Quyidagi tugmani bosing:',
          keyboard
        );
      } else if (message.contact) {
        const contact = message.contact;
        const phoneNumber = contact.phone_number.startsWith('+') 
          ? contact.phone_number 
          : `+${contact.phone_number}`;

        // Save chatId when user shares contact
        const existingUser = await storage.getUserByPhone(phoneNumber);
        if (existingUser) {
          await storage.updateUser(existingUser.id, { chatId: chatId });
        }

        const lastCodeTime = userLastCodeTime.get(telegramUserId);
        if (lastCodeTime && Date.now() - lastCodeTime < CODE_REQUEST_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((CODE_REQUEST_COOLDOWN_MS - (Date.now() - lastCodeTime)) / 1000);
          await sendTelegramMessage(
            chatId,
            `Iltimos kuting!\n\nYangi kod olish uchun ${remainingSeconds} soniya kutishingiz kerak.`
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

        if (!user.chatId || user.chatId !== chatId) {
          await storage.updateUser(user.id, { chatId } as any);
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
          ? '<b>Xush kelibsiz!</b>\n\n'
          : '<b>Tabriklaymiz!</b>\n\n' + 'Siz muvaffaqiyatli ro\'yxatdan o\'tdingiz!\n\n';

        const loginUrl = `${APP_URL}/telegram-login`;

        const inlineKeyboard = {
          inline_keyboard: [
            [{ text: 'Ilovaga qaytish', url: loginUrl }],
          ],
        };

        await sendTelegramMessage(
          chatId,
          welcomeText +
          `Ilovaga qayting va bu kodni kiriting:\n\n<code>${loginCode}</code>\n\n` +
          '<b>Diqqat:</b>\n' +
          '- Kod 5 daqiqa amal qiladi\n' +
          '- Bu kodni hech kimga bermang!\n' +
          '- Faqat 3 marta urinish huquqingiz bor',
          inlineKeyboard
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
  if (!data) {
    console.log('[Callback] No data in callback query, skipping');
    return;
  }

  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  
  if (!chatId || !messageId) {
    console.log('[Callback] Missing chatId or messageId:', { chatId, messageId });
    return;
  }

  console.log(`[Callback] Processing: ${data}, chatId: ${chatId}, messageId: ${messageId}`);

  if (data.startsWith('pay_approve_')) {
    const paymentId = data.replace('pay_approve_', '');
    console.log(`[Callback] Approving payment: ${paymentId}`);
    
    let payment;
    try {
      payment = await storage.getCreditPayment(paymentId);
      console.log(`[Callback] Payment found:`, payment ? `credits=${payment.credits}, status=${payment.status}` : 'null');
    } catch (err) {
      console.error(`[Callback] DB error getting payment:`, err);
      await answerCallbackQuery(callbackQuery.id, 'Bazada xatolik');
      return;
    }
    
    if (!payment) {
      await answerCallbackQuery(callbackQuery.id, 'To\'lov topilmadi');
      return;
    }

    let user;
    try {
      user = await storage.getUser(payment.userId);
      console.log(`[Callback] User found:`, user ? `name=${user.name}, credits=${user.credits}` : 'null');
    } catch (err) {
      console.error(`[Callback] DB error getting user:`, err);
      await answerCallbackQuery(callbackQuery.id, 'Bazada xatolik');
      return;
    }

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
    
    try {
      await storage.updateUserCreditsWithExpiry(user.id, newCredits, expiryDate);
      console.log(`[Callback] Credits updated: ${user.credits} -> ${newCredits}`);
      await storage.updateCreditPayment(paymentId, { status: 'approved' } as any);
      console.log(`[Callback] Payment status -> approved`);
    } catch (err) {
      console.error(`[Callback] DB error updating credits/payment:`, err);
      await answerCallbackQuery(callbackQuery.id, 'Yangilashda xatolik');
      return;
    }

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
    console.log(`[Callback] Approval complete for payment ${paymentId}`);
  }
  else if (data.startsWith('pay_reject_')) {
    const paymentId = data.replace('pay_reject_', '');
    console.log(`[Callback] Rejecting payment: ${paymentId}`);
    
    let payment;
    try {
      payment = await storage.getCreditPayment(paymentId);
    } catch (err) {
      console.error(`[Callback] DB error getting payment:`, err);
      await answerCallbackQuery(callbackQuery.id, 'Bazada xatolik');
      return;
    }
    
    if (!payment) {
      await answerCallbackQuery(callbackQuery.id, 'To\'lov topilmadi');
      return;
    }

    try {
      await storage.updateCreditPayment(paymentId, { status: 'rejected' } as any);
      console.log(`[Callback] Payment status -> rejected`);
    } catch (err) {
      console.error(`[Callback] DB error rejecting payment:`, err);
      await answerCallbackQuery(callbackQuery.id, 'Yangilashda xatolik');
      return;
    }
    
    await editMessageReplyMarkup(chatId, messageId);
    await sendTelegramMessage(chatId, `To'lov rad etildi.`);

    try {
      const user = await storage.getUser(payment.userId);
      if (user?.chatId) {
        await sendTelegramMessage(user.chatId,
          `Sizning to'lovingiz rad etildi.\n\n` +
          `Iltimos, to'g'ri chek yuborishga harakat qiling yoki qo'llab-quvvatlash xizmatiga murojaat qiling.`
        );
      }
    } catch (err) {
      console.error(`[Callback] Error notifying user about rejection:`, err);
    }

    await answerCallbackQuery(callbackQuery.id, 'Rad etildi');
    console.log(`[Callback] Rejection complete for payment ${paymentId}`);
  }
  else if (data.startsWith('pay_change_')) {
    const paymentId = data.replace('pay_change_', '');
    console.log(`[Callback] Change amount for payment: ${paymentId}`);
    
    pendingAmountChanges.set(`amount_${chatId}`, paymentId);
    
    await sendTelegramMessage(chatId, 
      `Yangi summani kiriting (so'mda):\n\n` +
      `Masalan: 150000`
    );

    await answerCallbackQuery(callbackQuery.id, 'Yangi summani kiriting');
    console.log(`[Callback] Amount change initiated for payment ${paymentId}`);
  }
  else {
    console.log(`[Callback] Unknown callback data: ${data}`);
    await answerCallbackQuery(callbackQuery.id);
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
