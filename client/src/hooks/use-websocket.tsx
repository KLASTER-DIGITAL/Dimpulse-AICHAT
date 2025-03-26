import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../lib/queryClient';

// Эмуляция статусов WebSocket для обратной совместимости с остальным кодом
type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  reconnectInterval?: number;
}

interface UseWebSocketResult {
  status: WebSocketStatus;
  sendMessage: (data: any) => void;
  joinChat: (chatId: string) => void;
}

// Эмуляция WebSocket с использованием long polling - более надежный подход для Replit
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
  
  const {
    onMessage,
    onStatusChange,
    reconnectInterval = 3000,
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
  
  // Эмуляция отправки сообщения через WebSocket
  const sendMessage = useCallback((data: any) => {
    if (!activeChatIdRef.current) {
      console.warn('Cannot send message, not connected to any chat');
      return;
    }
    
    // Отправляем сообщение через HTTP API вместо WebSocket
    if (data.type === 'ping') {
      // Игнорируем ping сообщения, это только для настоящего WebSocket
      console.log('Ignoring ping message in polling mode');
      
      // Эмулируем получение pong для совместимости с кодом, который этого ожидает
      setTimeout(() => {
        onMessage?.({
          type: 'pong',
          timestamp: new Date().toISOString()
        });
      }, 50);
      
      return;
    }
    
    if (data.type === 'join') {
      // Уже обрабатывается в joinChat
      return;
    }
    
    // Для других типов сообщений выполняем HTTP запрос
    console.log('Sending message via HTTP API:', data);
    
    // Эмуляция отправки через HTTP - при необходимости можно реализовать реальную отправку
    apiRequest(`/api/chats/${activeChatIdRef.current}/ws-message`, {
      method: 'POST',
      data: data
    }).catch((error: Error) => {
      console.error('Error sending message via HTTP API:', error);
      setStatus('error');
      onStatusChange?.('error');
    });
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
  
  // Запускаем опрос при монтировании компонента
  useEffect(() => {
    // Имитируем "подключение" установкой статуса
    setStatus('open');
    onStatusChange?.('open');
    
    // Отправляем начальное сообщение, имитирующее соединение
    onMessage?.({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    });
    
    // Если есть chatId, присоединяемся к нему
    if (chatId) {
      joinChat(chatId);
    }
    
    // Запускаем интервальный опрос
    pollIntervalRef.current = setInterval(pollForUpdates, reconnectInterval);
    
    // Очистка при размонтировании
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      setStatus('closed');
      onStatusChange?.('closed');
    };
  }, [chatId, joinChat, onMessage, onStatusChange, pollForUpdates, reconnectInterval]);
  
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