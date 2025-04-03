import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLongPollingOptions {
  onMessage?: (message: any) => void;
  onStatusChange?: (status: string) => void;
  pollingInterval?: number;
  enabled?: boolean;
}

interface PollingResponse {
  messages: any[];
  status: string;
}

/**
 * Хук для использования long polling вместо WebSocket
 */
const useLongPolling = (chatId: string | null, options: UseLongPollingOptions = {}) => {
  const {
    onMessage,
    onStatusChange,
    pollingInterval = 1000,
    enabled = true
  } = options;

  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Обновление статуса с уведомлением
  const updateStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  }, [onStatusChange]);

  // Функция для отправки сообщения
  const sendMessage = useCallback(async (message: any) => {
    if (!chatId) {
      console.error('Cannot send message: chatId is null');
      return;
    }

    try {
      updateStatus('sending');
      
      const response = await fetch(`/api/polling/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
      
      updateStatus('sent');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      updateStatus('error');
    }
  }, [chatId, updateStatus]);

  // Функция для получения сообщений через long polling
  const pollMessages = useCallback(async () => {
    if (!chatId || !enabled) {
      return;
    }

    try {
      // Отменяем предыдущий запрос, если он есть
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Создаем новый AbortController для текущего запроса
      abortControllerRef.current = new AbortController();
      
      updateStatus('polling');
      
      const response = await fetch(`/api/polling/chat/${chatId}/messages`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`Polling failed: ${response.statusText}`);
      }
      
      const data: PollingResponse = await response.json();
      
      // Обрабатываем полученные сообщения
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(message => {
          if (onMessage) {
            onMessage(message);
          }
        });
      }
      
      updateStatus('connected');
      
      // Планируем следующий запрос
      pollingTimeoutRef.current = setTimeout(() => {
        pollMessages();
      }, pollingInterval);
      
    } catch (err) {
      // Игнорируем ошибки, связанные с отменой запроса
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      console.error('Polling error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      updateStatus('error');
      
      // Пробуем переподключиться через некоторое время
      pollingTimeoutRef.current = setTimeout(() => {
        pollMessages();
      }, 5000); // Пробуем через 5 секунд
    }
  }, [chatId, enabled, onMessage, pollingInterval, updateStatus]);

  // Запускаем long polling при монтировании компонента
  useEffect(() => {
    if (chatId && enabled) {
      updateStatus('connecting');
      pollMessages();
    } else {
      updateStatus('idle');
    }
    
    return () => {
      // Отменяем текущий запрос при размонтировании
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Очищаем таймер
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [chatId, enabled, pollMessages, updateStatus]);

  return {
    status,
    error,
    sendMessage
  };
};

export default useLongPolling;
