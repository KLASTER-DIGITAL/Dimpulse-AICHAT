import { VercelRequest, VercelResponse } from '@vercel/node';

// Глобальные хранилища для Vercel Serverless Functions
// Обратите внимание, что эти данные будут сбрасываться при каждом холодном старте функции
// В продакшене лучше использовать внешнее хранилище данных
let messageQueues: Record<string, Array<any>> = {};
let waitingResponses: Record<string, Array<{ resolve: (value: any) => void, timestamp: number }>> = {};

// Максимальное время ожидания для long polling (9 секунд - меньше чем таймаут Vercel)
const MAX_WAIT_TIME = 9000;

// Добавление сообщения в очередь для конкретного чата
export const addMessageToQueue = (chatId: string, message: any) => {
  if (!messageQueues[chatId]) {
    messageQueues[chatId] = [];
  }
  
  messageQueues[chatId].push(message);
  
  // Отправляем сообщение всем ожидающим клиентам для этого чата
  if (waitingResponses[chatId] && waitingResponses[chatId].length > 0) {
    const responses = [...waitingResponses[chatId]];
    waitingResponses[chatId] = [];
    
    responses.forEach(({ resolve }) => {
      resolve({
        messages: [message],
        status: 'success'
      });
    });
  }
};

// Обработчик для long polling
export const handleLongPolling = async (req: VercelRequest, res: VercelResponse, chatId: string) => {
  // Проверяем, есть ли сообщения в очереди
  if (messageQueues[chatId] && messageQueues[chatId].length > 0) {
    // Если есть сообщения, отправляем их клиенту
    const messages = [...messageQueues[chatId]];
    messageQueues[chatId] = [];
    
    return res.status(200).json({
      messages,
      status: 'success'
    });
  }
  
  // Если сообщений нет, используем Promise для ожидания
  try {
    const result = await new Promise((resolve, reject) => {
      // Создаем массив для ожидающих клиентов, если его еще нет
      if (!waitingResponses[chatId]) {
        waitingResponses[chatId] = [];
      }
      
      // Добавляем функцию resolve в массив ожидающих
      const timestamp = Date.now();
      waitingResponses[chatId].push({ resolve, timestamp });
      
      // Устанавливаем таймаут для предотвращения вечного ожидания
      setTimeout(() => {
        // Находим и удаляем этот объект из массива ожидающих
        if (waitingResponses[chatId]) {
          const index = waitingResponses[chatId].findIndex(item => item.timestamp === timestamp);
          if (index !== -1) {
            waitingResponses[chatId].splice(index, 1);
          }
        }
        
        // Возвращаем пустой ответ по таймауту
        resolve({
          messages: [],
          status: 'timeout'
        });
      }, MAX_WAIT_TIME);
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Long polling error:', error);
    return res.status(500).json({
      messages: [],
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Периодическая очистка устаревших ожидающих клиентов
// Обратите внимание, что в Serverless Functions этот интервал не будет работать постоянно
// В продакшене лучше использовать внешнее хранилище данных
setInterval(() => {
  const now = Date.now();
  
  Object.keys(waitingResponses).forEach(chatId => {
    if (waitingResponses[chatId]) {
      waitingResponses[chatId] = waitingResponses[chatId].filter(item => {
        const isExpired = now - item.timestamp > MAX_WAIT_TIME;
        
        if (isExpired) {
          item.resolve({
            messages: [],
            status: 'timeout'
          });
        }
        
        return !isExpired;
      });
    }
  });
}, 5000);
