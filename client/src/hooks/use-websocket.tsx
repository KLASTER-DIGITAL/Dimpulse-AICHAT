import { useState, useEffect, useCallback, useRef } from 'react';
// В браузере WebSocket доступен глобально, не нужно импортировать

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketResult {
  status: WebSocketStatus;
  sendMessage: (data: any) => void;
  joinChat: (chatId: string) => void;
}

export const useWebSocket = (
  chatId: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketResult => {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    onMessage,
    onStatusChange,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;
  
  // Функция для создания WebSocket соединения
  const connectWebSocket = useCallback(() => {
    // Проверка состояния сети и текущего соединения
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('Network is offline, WebSocket connection delayed');
      setStatus('error');
      return;
    }
    
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }
      
      // Закрываем существующее соединение перед созданием нового
      try {
        websocketRef.current.close();
      } catch (e) {
        console.log('Error closing existing WebSocket:', e);
      }
      websocketRef.current = null;
    }
    
    try {
      setStatus('connecting');
      
      // Определяем правильный протокол (ws или wss) на основе текущего протокола страницы
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      // Позволяем подключаться к WebSocket как в разработке, так и в production
      let wsUrl;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Локальная разработка 
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app')) {
        // Deployed on Replit
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        // Другие домены, если нужны конкретные настройки для других hosting провайдеров
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      // Создаем новое соединение с браузерным WebSocket API и добавляем таймаут
      const ws = new window.WebSocket(wsUrl);
      
      // Установим таймаут для соединения 
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout');
          ws.close();
        }
      }, 5000);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        // Очищаем таймаут соединения, так как оно успешно установлено
        clearTimeout(connectionTimeout);
        setStatus('open');
        onStatusChange?.('open');
        reconnectAttemptsRef.current = 0;
        
        // Если есть chatId, сразу подключаемся к чату
        if (chatId) {
          // Используем setTimeout для небольшой задержки, чтобы убедиться,
          // что соединение стабильно
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              console.log(`Joining chat ${chatId} via WebSocket`);
              ws.send(JSON.stringify({
                type: 'join',
                chatId
              }));
            }
          }, 100);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed with code ${event.code}`, event.reason);
        // Очищаем таймаут соединения, если он все еще активен
        clearTimeout(connectionTimeout);
        setStatus('closed');
        onStatusChange?.('closed');
        websocketRef.current = null;
        
        // Пытаемся переподключиться, если включена автоматическая реконнекция
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectWebSocket();
          }, reconnectInterval);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Очищаем таймаут соединения, если он все еще активен
        clearTimeout(connectionTimeout);
        setStatus('error');
        onStatusChange?.('error');
      };
      
      websocketRef.current = ws as any;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setStatus('error');
      onStatusChange?.('error');
    }
  }, [
    chatId,
    onMessage,
    onStatusChange,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts
  ]);
  
  // Функция для отправки сообщений
  const sendMessage = useCallback((data: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message, WebSocket is not open');
      // Пытаемся переподключиться и отправить сообщение позже
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        connectWebSocket();
      }
    }
  }, [connectWebSocket, autoReconnect, maxReconnectAttempts]);
  
  // Функция для подключения к конкретному чату
  const joinChat = useCallback((chatId: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log(`Joining chat ${chatId} via WebSocket`);
      websocketRef.current.send(JSON.stringify({
        type: 'join',
        chatId
      }));
    } else {
      console.warn('Cannot join chat, WebSocket is not open');
      // Пытаемся переподключиться и присоединиться к чату позже
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        console.log('Reconnecting to join chat...');
        connectWebSocket();
      }
    }
  }, [connectWebSocket, autoReconnect, maxReconnectAttempts]);
  
  // Подключаемся при монтировании компонента
  useEffect(() => {
    // Небольшая задержка перед первым подключением
    setTimeout(() => {
      connectWebSocket();
    }, 500);
    
    // Функция для переподключения при восстановлении соединения с интернетом
    const handleOnline = () => {
      console.log('Network is back online. Reconnecting WebSocket...');
      reconnectAttemptsRef.current = 0;
      connectWebSocket();
    };
    
    // Слушаем события онлайн/оффлайн
    window.addEventListener('online', handleOnline);
    
    // Очистка при размонтировании
    return () => {
      window.removeEventListener('online', handleOnline);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, [connectWebSocket]);
  
  // Подключаемся к чату, когда chatId изменяется
  useEffect(() => {
    if (chatId && status === 'open') {
      joinChat(chatId);
    }
  }, [chatId, status, joinChat]);
  
  return {
    status,
    sendMessage,
    joinChat
  };
};