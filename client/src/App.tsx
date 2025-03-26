import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Cabinet from "@/pages/Cabinet";
import ProtectedRoute from "@/components/ProtectedRoute";
import UIStyleProvider from "@/components/ChatGPT/UIStyleProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:id" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/cabinet">
        {() => (
          <ProtectedRoute>
            <Cabinet />
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Improved WebSocket connection handling
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
        
        ws = new WebSocket(wsUrl, 'chat');

        ws.onopen = () => {
          console.log('WebSocket connected');
          reconnectAttempts = 0;
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connect, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws?.close();
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UIStyleProvider>
        <Router />
        <Toaster />
      </UIStyleProvider>
    </QueryClientProvider>
  );
}

export default App;
