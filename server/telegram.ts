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

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

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

export function setupTelegramWebhook(app: Express, storage: IStorage) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BOT_USERNAME) {
    console.warn('Telegram bot credentials not configured. Skipping webhook setup.');
    return;
  }

  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update: TelegramUpdate = req.body;
      
      if (!update.message) {
        return res.sendStatus(200);
      }

      const message = update.message;
      const chatId = message.chat.id;
      const telegramUserId = message.from.id.toString();

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

  app.get('/api/telegram/auth-url', (req, res) => {
    const botUsername = TELEGRAM_BOT_USERNAME;
    const authUrl = `https://t.me/${botUsername}`;
    res.json({ url: authUrl });
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
      body: JSON.stringify({ url: webhookUrl }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Telegram webhook set successfully:', webhookUrl);
    } else {
      console.error('❌ Failed to set Telegram webhook:', data);
    }
    
    return data;
  } catch (error) {
    console.error('Error setting Telegram webhook:', error);
    return null;
  }
}
