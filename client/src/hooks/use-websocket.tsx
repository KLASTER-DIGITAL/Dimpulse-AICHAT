import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../lib/queryClient';

// Эмуляция статусов WebSocket для обратной совместимости с остальным кодом
type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketResult {
  status: WebSocketStatus;
  sendMessage: (data: any) => void;
  joinChat: (chatId: string) => void;
}

// Гибридная реализация: пробуем сначала WebSocket, а потом при необходимости fallback на polling
export const useWebSocket = (
  chatId: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketResult => {
  // Сохраняем совместимость с остальным кодом
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  
  // Интервал опроса для эмуляции WebSocket
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Последний полученный timestamp для предотвращения дубликатов
  const lastMessageTimestamp = useRef<string | null>(null);
  
  // Активный chatId
  const activeChatIdRef = useRef<string | null>(null);
  
  // Счетчик попыток переподключения WebSocket
  const reconnectCountRef = useRef<number>(0);
  
  // WebSocket соединение
  const wsRef = useRef<WebSocket | null>(null);
  
  // Режим работы: "websocket" или "polling"
  const modeRef = useRef<'websocket' | 'polling'>('websocket');
  
  const {
    onMessage,
    onStatusChange,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;
  
  // Эмуляция подключения к чату
  const joinChat = useCallback((newChatId: string) => {
    console.log(`Joining chat ${newChatId} via polling API`);
    activeChatIdRef.current = newChatId;
    
    // Уведомляем о "подключении"
    setStatus('open');
    onStatusChange?.('open');
    
    // Имитируем сообщение о подключении к чату
    onMessage?.({
      type: 'joined',
      chatId: newChatId,
      timestamp: new Date().toISOString()
    });
  }, [onMessage, onStatusChange]);
  
  // Гибридная функция отправки сообщения через WebSocket или HTTP API
  const sendMessage = useCallback((data: any) => {
    if (!activeChatIdRef.current) {
      console.warn('Cannot send message, not connected to any chat');
      return;
    }
    
    // Обработка ping сообщений
    if (data.type === 'ping') {
      if (modeRef.current === 'websocket' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Отправляем ping через WebSocket
        wsRef.current.send(JSON.stringify(data));
      } else {
        // В режиме polling эмулируем получение pong
        console.log('Emulating pong response in polling mode');
        setTimeout(() => {
          onMessage?.({
            type: 'pong',
            timestamp: new Date().toISOString()
          });
        }, 50);
      }
      return;
    }
    
    // Обработка join сообщений
    if (data.type === 'join') {
      // Через WebSocket отправляем join, в режиме polling обрабатываем локально
      if (modeRef.current === 'websocket' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      } else {
        // В polling режиме join уже обрабатывается в функции joinChat
        console.log('Join message handled by joinChat in polling mode');
      }
      return;
    }
    
    // Для других типов сообщений
    if (modeRef.current === 'websocket' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Отправляем через WebSocket если соединение открыто
      console.log('Sending message via WebSocket:', data);
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending message via WebSocket:', error);
        // При ошибке отправки через WebSocket переключаемся на HTTP API
        console.log('Fallback to HTTP API after WebSocket send error');
        
        apiRequest(`/api/chats/${activeChatIdRef.current}/ws-message`, {
          method: 'POST',
          data: data
        }).catch((apiError: Error) => {
          console.error('Error sending message via HTTP API fallback:', apiError);
          setStatus('error');
          onStatusChange?.('error');
        });
      }
    } else {
      // В режиме polling или если WebSocket не доступен - используем HTTP API
      console.log('Sending message via HTTP API:', data);
      
      apiRequest(`/api/chats/${activeChatIdRef.current}/ws-message`, {
        method: 'POST',
        data: data
      }).catch((error: Error) => {
        console.error('Error sending message via HTTP API:', error);
        setStatus('error');
        onStatusChange?.('error');
      });
    }
  }, [onMessage, onStatusChange]);
  
  // Опрос сервера для получения обновлений для текущего чата
  const pollForUpdates = useCallback(async () => {
    if (!activeChatIdRef.current) {
      return;
    }
    
    try {
      // Делаем запрос к API для получения обновлений для текущего чата
      // Обычно это будет маршрут /api/chats/:chatId/messages с параметром since=timestamp
      const timestamp = lastMessageTimestamp.current || new Date().toISOString();
      const response = await apiRequest(`/api/chats/${activeChatIdRef.current}?t=${Date.now()}`);
      
      // Если чат обновился с момента последнего опроса, обрабатываем обновления
      if (response && response.messages) {
        // Проверяем, есть ли новые сообщения
        const messages = response.messages;
        if (messages.length > 0) {
          // Обновляем последний timestamp
          lastMessageTimestamp.current = new Date().toISOString();
          
          // Эмулируем событие typing для совместимости с остальным кодом
          onMessage?.({
            type: 'typing',
            chatId: activeChatIdRef.current,
            status: 'started',
            timestamp: new Date().toISOString()
          });
          
          // Для каждого сообщения от ассистента имитируем событие typing finished
          messages.forEach((message: { role: string, id: string }) => {
            if (message.role === 'assistant') {
              onMessage?.({
                type: 'typing',
                chatId: activeChatIdRef.current,
                status: 'finished',
                messageId: message.id,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error polling for updates:', error);
      // Не меняем статус при ошибке опроса, просто логируем
    }
  }, [onMessage]);
  
  // Функция отключена для деплоя - использует только режим polling
  const createWebSocket = useCallback(() => {
    console.log('WebSocket connections disabled for deployment, using polling mode');
    
    // Всегда используем polling для стабильной работы при деплое
    modeRef.current = 'polling';
    
    // Имитируем подключение установкой статуса
    setStatus('open');
    onStatusChange?.('open');
    
    // Отправляем начальное сообщение, имитирующее соединение
    onMessage?.({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    });
    
    // Запускаем интервальный опрос
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(pollForUpdates, reconnectInterval);
    }
    
    // Если есть активный чат, присоединяемся к нему
    if (activeChatIdRef.current) {
      joinChat(activeChatIdRef.current);
    }
  }, [joinChat, onMessage, onStatusChange, pollForUpdates, reconnectInterval]);
  
  // Запуск только в режиме polling при монтировании компонента для деплоя
  useEffect(() => {
    // Всегда запускаемся в режиме polling для деплоя
    modeRef.current = 'polling';
    console.log('WebSocket disabled for deployment, using polling mode');
    
    // Имитируем "подключение" установкой статуса
    setStatus('open');
    onStatusChange?.('open');
    
    // Отправляем начальное сообщение, имитирующее соединение
    onMessage?.({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    });
    
    // Запускаем интервальный опрос для обновления данных
    pollIntervalRef.current = setInterval(pollForUpdates, reconnectInterval);
    
    // Если есть chatId, присоединяемся к нему
    if (chatId) {
      joinChat(chatId);
    }
    
    // Очистка при размонтировании
    return () => {
      // Очищаем интервал опроса
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Закрываем WebSocket соединение если оно открыто
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
      
      setStatus('closed');
      onStatusChange?.('closed');
    };
  }, [chatId, createWebSocket, joinChat, onMessage, onStatusChange, pollForUpdates, reconnectInterval]);
  
  // Обновляем chatId, если он изменился
  useEffect(() => {
    if (chatId && chatId !== activeChatIdRef.current) {
      joinChat(chatId);
    }
  }, [chatId, joinChat]);
  
  return {
    status,
    sendMessage,
    joinChat
  };
};