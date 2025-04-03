import { Request, Response } from 'express';

// Хранилище сообщений для каждого чата
const messageQueues: Record<string, Array<any>> = {};
// Хранилище ожидающих клиентов
const waitingClients: Record<string, Array<{ res: Response, timestamp: number }>> = {};

// Максимальное время ожидания для long polling (30 секунд)
const MAX_WAIT_TIME = 30000;

// Добавление сообщения в очередь для конкретного чата
export const addMessageToQueue = (chatId: string, message: any) => {
  if (!messageQueues[chatId]) {
    messageQueues[chatId] = [];
  }
  
  messageQueues[chatId].push(message);
  
  // Отправляем сообщение всем ожидающим клиентам для этого чата
  if (waitingClients[chatId] && waitingClients[chatId].length > 0) {
    const clients = [...waitingClients[chatId]];
    waitingClients[chatId] = [];
    
    clients.forEach(client => {
      client.res.json({
        messages: [message],
        status: 'success'
      });
    });
  }
};

// Обработчик для long polling
export const handleLongPolling = async (req: Request, res: Response) => {
  const chatId = req.params.chatId;
  
  // Проверяем, есть ли сообщения в очереди
  if (messageQueues[chatId] && messageQueues[chatId].length > 0) {
    // Если есть сообщения, отправляем их клиенту
    const messages = [...messageQueues[chatId]];
    messageQueues[chatId] = [];
    
    return res.json({
      messages,
      status: 'success'
    });
  }
  
  // Если сообщений нет, добавляем клиента в список ожидающих
  if (!waitingClients[chatId]) {
    waitingClients[chatId] = [];
  }
  
  // Устанавливаем таймаут для ответа
  const timestamp = Date.now();
  waitingClients[chatId].push({ res, timestamp });
  
  // Устанавливаем таймер для проверки истечения времени ожидания
  const timeoutId = setTimeout(() => {
    // Находим клиента в списке ожидающих
    if (waitingClients[chatId]) {
      const index = waitingClients[chatId].findIndex(client => client.res === res);
      if (index !== -1) {
        // Удаляем клиента из списка ожидающих
        waitingClients[chatId].splice(index, 1);
        
        // Отправляем пустой ответ
        res.json({
          messages: [],
          status: 'timeout'
        });
      }
    }
  }, MAX_WAIT_TIME);
  
  // Обрабатываем закрытие соединения
  req.on('close', () => {
    clearTimeout(timeoutId);
    
    if (waitingClients[chatId]) {
      const index = waitingClients[chatId].findIndex(client => client.res === res);
      if (index !== -1) {
        waitingClients[chatId].splice(index, 1);
      }
    }
  });
};

// Отправка сообщения в конкретный чат
export const sendMessage = (req: Request, res: Response) => {
  const chatId = req.params.chatId;
  const message = req.body;
  
  // Добавляем сообщение в очередь
  addMessageToQueue(chatId, message);
  
  res.json({
    status: 'success',
    message: 'Message sent'
  });
};

// Периодическая очистка устаревших клиентов
setInterval(() => {
  const now = Date.now();
  
  Object.keys(waitingClients).forEach(chatId => {
    waitingClients[chatId] = waitingClients[chatId].filter(client => {
      const isExpired = now - client.timestamp > MAX_WAIT_TIME;
      
      if (isExpired) {
        client.res.json({
          messages: [],
          status: 'timeout'
        });
      }
      
      return !isExpired;
    });
  });
}, 10000); // Проверка каждые 10 секунд
