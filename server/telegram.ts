import type { Express } from 'express';
import type { IStorage } from './storage';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

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

      if (message.text === '/start') {
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

        let user = await storage.getUserByTelegramId(telegramUserId);
        
        if (!user) {
          user = await storage.createUser({
            telegramId: telegramUserId,
            phone: phoneNumber,
          });

          await sendTelegramMessage(
            chatId,
            '✅ <b>Tabriklaymiz!</b>\n\n' +
            'Siz muvaffaqiyatli ro\'yxatdan o\'tdingiz!\n\n' +
            'Endi ilovaga qayting va profilingizni to\'ldiring.'
          );
        } else {
          await sendTelegramMessage(
            chatId,
            '👋 <b>Xush kelibsiz!</b>\n\n' +
            'Siz allaqachon ro\'yxatdan o\'tgansiz.\n\n' +
            'Ilovaga qayting va davom eting.'
          );
        }
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

  app.post('/api/telegram/check-auth', async (req, res) => {
    try {
      const { telegramId } = req.body;
      
      if (!telegramId) {
        return res.status(400).json({ message: 'Telegram ID talab qilinadi' });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      
      if (user) {
        (req as any).login(user, (err: any) => {
          if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: 'Tizimga kirish xatosi' });
          }
          res.json({ 
            success: true, 
            user,
            profileCompleted: user.profileCompleted 
          });
        });
      } else {
        res.json({ 
          success: false, 
          message: 'Foydalanuvchi topilmadi' 
        });
      }
    } catch (error) {
      console.error('Check auth error:', error);
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
