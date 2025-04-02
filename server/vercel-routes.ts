import express, { Express, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import cors from 'cors';
import { storage } from './storage';
import { settingsSchema, insertChatSchema, insertMessageSchema } from '../shared/schema';
import { authenticateUser, registerUser, authMiddleware, logoutUser, getUserByToken } from './auth';

// Middleware для CORS
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Разрешаем CORS для всех доменов при деплое
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

// Регистрация маршрутов API
export async function registerRoutes(app: Express): Promise<Express> {
  app.use(corsMiddleware);
  
  // API для получения списка чатов
  app.get('/api/chats', async (req, res) => {
    try {
      // Параметр userId может отсутствовать для публичных чатов
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;
      const chats = await storage.getChatsByUserId(userId);
      res.json(chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });
  
  // API для создания нового чата
  app.post('/api/chats', async (req, res) => {
    try {
      // Валидация данных
      const parsedData = insertChatSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ error: 'Invalid chat data' });
      }
      
      // Если ID не указан, генерируем случайный UUID
      const chatData = {
        ...parsedData.data,
        id: parsedData.data.id || randomUUID()
      };
      
      const newChat = await storage.createChat(chatData);
      res.status(201).json(newChat);
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ error: 'Failed to create chat' });
    }
  });
  
  // API для получения конкретного чата с сообщениями
  app.get('/api/chats/:id', async (req, res) => {
    try {
      const chatId = req.params.id;
      const chat = await storage.getChatById(chatId);
      
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      
      const messages = await storage.getMessagesByChatId(chatId);
      
      res.json({
        chat,
        messages
      });
    } catch (error) {
      console.error('Error fetching chat:', error);
      res.status(500).json({ error: 'Failed to fetch chat' });
    }
  });
  
  // API для обновления заголовка чата
  app.put('/api/chats/:id/title', async (req, res) => {
    try {
      const chatId = req.params.id;
      const { title } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      await storage.updateChatTitle(chatId, title);
      
      const updatedChat = await storage.getChatById(chatId);
      res.json(updatedChat);
    } catch (error) {
      console.error('Error updating chat title:', error);
      res.status(500).json({ error: 'Failed to update chat title' });
    }
  });
  
  // API для создания сообщения
  app.post('/api/chats/:id/messages', async (req, res) => {
    try {
      const chatId = req.params.id;
      const messageData = req.body;
      
      // Проверяем, существует ли чат
      const chat = await storage.getChatById(chatId);
      
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      
      // Валидация данных сообщения
      const parsedData = insertMessageSchema.safeParse({
        ...messageData,
        chatId
      });
      
      if (!parsedData.success) {
        return res.status(400).json({ error: 'Invalid message data' });
      }
      
      // Создаем сообщение
      const message = await storage.createMessage(parsedData.data);
      
      // Подготавливаем ответ ассистента
      if (messageData.role === 'user') {
        setTimeout(async () => {
          try {
            // Создаем сообщение от ассистента
            const assistantMessage = await storage.createMessage({
              chatId,
              role: 'assistant',
              content: generateAssistantResponse(messageData.content)
              // createdAt автоматически устанавливается в хранилище
            });
            
            // Отправляем уведомление через webhook, если настроен
            try {
              const settings = await storage.getSettings();
              if (settings.webhook.enabled && settings.webhook.url) {
                await sendWebhook(settings.webhook.url, {
                  type: 'message_created',
                  data: assistantMessage
                });
              }
            } catch (webhookError) {
              console.error('Error sending webhook:', webhookError);
            }
          } catch (assistantError) {
            console.error('Error creating assistant message:', assistantError);
          }
        }, 1000); // Задержка в 1 секунду для имитации обработки
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  });
  
  // API для эмуляции WebSocket сообщений (для Vercel)
  app.post('/api/chats/:id/ws-message', async (req, res) => {
    try {
      const chatId = req.params.id;
      const messageData = req.body;
      
      console.log('Received message via HTTP API:', messageData);
      
      // Эмулируем обработку WebSocket сообщений через HTTP
      if (messageData.type === 'join') {
        res.json({
          type: 'joined',
          chatId,
          timestamp: new Date().toISOString()
        });
      } else if (messageData.type === 'ping') {
        res.json({
          type: 'pong',
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          type: 'ack',
          messageId: messageData.id || randomUUID(),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error handling ws-message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });
  
  // API для получения настроек
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });
  
  // API для обновления настроек
  app.put('/api/settings', async (req, res) => {
    try {
      const parsedData = settingsSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ error: 'Invalid settings data' });
      }
      
      const updatedSettings = await storage.updateSettings(parsedData.data);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });
  
  // API для обновления URL вебхука
  app.put('/api/settings/webhook', async (req, res) => {
    try {
      const { url, enabled } = req.body;
      
      if (url === undefined || enabled === undefined) {
        return res.status(400).json({ error: 'URL and enabled flag are required' });
      }
      
      const updatedSettings = await storage.updateWebhookUrl(url, enabled);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating webhook URL:', error);
      res.status(500).json({ error: 'Failed to update webhook URL' });
    }
  });
  
  // API для получения статистики
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
  
  // API для истории диалогов с пагинацией
  app.get('/api/dialog-history', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      
      const result = await storage.getDialogHistory(limit, offset);
      res.json(result);
    } catch (error) {
      console.error('Error fetching dialog history:', error);
      res.status(500).json({ error: 'Failed to fetch dialog history' });
    }
  });
  
  // API для аутентификации
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      const result = await authenticateUser(username, password);
      
      if (!result) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  });
  
  // API для регистрации
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      const user = await registerUser(username, email || '', password);
      
      if (!user) {
        return res.status(400).json({ error: 'Failed to register' });
      }
      
      res.status(201).json(user);
    } catch (error) {
      console.error('Error registering:', error);
      res.status(500).json({ error: 'Failed to register' });
    }
  });
  
  // API для выхода
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }
      
      const success = await logoutUser(token);
      
      if (!success) {
        return res.status(400).json({ error: 'Failed to log out' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({ error: 'Failed to log out' });
    }
  });
  
  // API для получения информации о пользователе
  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const user = await getUserByToken(token);
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error getting user info:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  });
  
  return app;
}

// Функция для генерации ответа ассистента
function generateAssistantResponse(userMessage: string): string {
  const defaultResponse = "Спасибо за ваше сообщение! Чем я могу помочь?";
  
  if (userMessage.toLowerCase().includes('привет')) {
    return "Здравствуйте! Как я могу вам помочь?";
  }
  
  if (userMessage.toLowerCase().includes('помощь')) {
    return "Я могу помочь вам в различных вопросах. Просто напишите, что вас интересует.";
  }
  
  if (userMessage.toLowerCase().includes('консультац')) {
    return `Для записи на консультацию, пожалуйста, выберите удобное время в календаре:
    
<!-- Cal inline embed code begins -->
<div style="width:100%;height:100%;overflow:scroll" id="my-cal-inline"></div>
<script type="text/javascript">
  (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
Cal("init", "30min", {origin:"https://cal.com"});

  Cal.ns["30min"]("inline", {
    elementOrSelector:"#my-cal-inline",
    config: {"layout":"month_view","theme":"dark"},
    calLink: "dimpulse/30min",
  });

  Cal.ns["30min"]("ui", {"theme":"dark","hideEventTypeDetails":false,"layout":"month_view"});
  </script>
  <!-- Cal inline embed code ends -->

Если у вас есть предпочтения по времени или дате, дайте знать!`;
  }
  
  return defaultResponse;
}

// Функция для отправки webhook-уведомления
async function sendWebhook(url: string, data: any): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      console.error('Webhook error:', await response.text());
    }
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}