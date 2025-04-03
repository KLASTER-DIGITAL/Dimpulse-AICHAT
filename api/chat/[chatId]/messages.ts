import { VercelRequest, VercelResponse } from '@vercel/node';
import { addMessageToQueue, handleLongPolling } from '../../polling';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Настройка CORS для Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Получаем chatId из параметров маршрута
  const { chatId } = req.query;
  
  if (!chatId || Array.isArray(chatId)) {
    return res.status(400).json({ error: 'Invalid chat ID' });
  }

  try {
    // Обрабатываем запрос в зависимости от метода
    if (req.method === 'GET') {
      // Обработка long polling запроса
      return await handleLongPolling(req, res, chatId);
    } else if (req.method === 'POST') {
      // Обработка отправки сообщения
      const message = req.body;
      addMessageToQueue(chatId, message);
      return res.status(200).json({ status: 'success', message: 'Message sent' });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
