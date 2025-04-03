import { VercelRequest, VercelResponse } from '@vercel/node';
import { addMessageToQueue, handleLongPolling } from './polling';

// Обработчик для корневого маршрута API
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Настройка CORS для Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Логирование запроса
  console.log(`API Request: ${req.method} ${req.url}`);

  try {
    // Проверяем тип запроса и маршрут
    if (req.url?.includes('/chat/') && req.url?.includes('/messages')) {
      // Извлекаем chatId из URL
      const chatIdMatch = req.url.match(/\/chat\/([^\/]+)\/messages/);
      const chatId = chatIdMatch ? chatIdMatch[1] : null;

      if (!chatId) {
        return res.status(400).json({ error: 'Chat ID is required' });
      }

      if (req.method === 'GET') {
        // Обработка long polling запроса
        return await handleLongPolling(req, res, chatId);
      } else if (req.method === 'POST') {
        // Обработка отправки сообщения
        const message = req.body;
        addMessageToQueue(chatId, message);
        return res.status(200).json({ status: 'success', message: 'Message sent' });
      }
    }

    // Если маршрут не найден
    return res.status(404).json({ error: 'Route not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) });
  }
}
