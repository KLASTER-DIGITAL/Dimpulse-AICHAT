const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_DELAY = 2000;
const MAX_DELAY = 10000;

const reconnect = async (attempt: number) => {
      if (attempt > MAX_RECONNECT_ATTEMPTS) {
        console.log('Max reconnect attempts reached, switching to polling mode');
        setPolling(true);
        return;
      }

      const delay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
      console.log(`Attempting to reconnect (${attempt}/${MAX_RECONNECT_ATTEMPTS}) after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      connect();
    };