const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 5000;

const reconnect = async (attempt: number) => {
  if (attempt > MAX_RECONNECT_ATTEMPTS) {
    console.log('Max reconnect attempts reached, switching to polling mode');
    setPolling(true);
    return;
  }

  const delay = Math.min(BASE_DELAY * Math.pow(1.5, attempt - 1), MAX_DELAY);
  console.log(`Attempting to reconnect (${attempt}/${MAX_RECONNECT_ATTEMPTS}) after ${delay}ms`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    await connect();
  } catch (err) {
    console.error('Reconnection attempt failed:', err);
    reconnect(attempt + 1);
  }
};

const connect = () => {
  if (ws?.readyState === WebSocket.CONNECTING) {
    console.log('Connection already in progress');
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    setStatus('open');
    reconnectCountRef.current = 0;
  };

  ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    setStatus('closed');
    reconnect(reconnectCountRef.current + 1);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};