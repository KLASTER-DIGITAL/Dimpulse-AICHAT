import { useState, useEffect, useCallback, useRef } from 'react';

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
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    try {
      setStatus('connecting');
      
      // Определяем правильный протокол (ws или wss) на основе текущего протокола страницы
      // Используем относительный URL, чтобы избежать проблем с CORS и точками доступа
      const wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + 
                    '//' + window.location.host + '/ws';
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setStatus('open');
        onStatusChange?.('open');
        reconnectAttemptsRef.current = 0;
        
        // Если есть chatId, сразу подключаемся к чату
        if (chatId) {
          joinChat(chatId);
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
        setStatus('error');
        onStatusChange?.('error');
      };
      
      websocketRef.current = ws;
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
    }
  }, []);
  
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
    }
  }, []);
  
  // Подключаемся при монтировании компонента
  useEffect(() => {
    connectWebSocket();
    
    // Очистка при размонтировании
    return () => {
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