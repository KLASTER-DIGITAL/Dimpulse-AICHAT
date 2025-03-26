import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketServer } from 'ws'; // Added import for WebSocketServer
import { migrateDatabase } from "./migration"; // Импорт функции миграции


const app = express();
// Увеличиваем лимит размера JSON-запроса для обработки больших файлов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Добавляем ping/pong для WebSocket
const PING_INTERVAL = 30000; // 30 секунд

app.use((req, res, next) => {
  // WebSocket ping/pong будет добавлен в обработчик подключения WebSocket

  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Запускаем миграцию базы данных при старте сервера
  try {
    await migrateDatabase();
  } catch (error) {
    console.error('Database migration failed:', error);
  }
  
  const server = await registerRoutes(app);

  // WebSocket server setup should be added here.  This requires significant additional code
  // to handle connections, reconnections, error handling, and message passing.  Example below:

  // const wss = new WebSocketServer({ server, clientTracking: true, path: '/ws' });
  // wss.on('connection', ws => {
  //   ws.on('message', message => {
  //     // Handle incoming messages
  //   });
  //   ws.on('close', () => {
  //     // Handle connection closure
  //   });
  //   ws.on('error', error => {
  //     console.error('WebSocket error:', error);
  //     // Implement reconnection logic here
  //   });
  //   ws.send('Welcome to WebSocket!'); // Send initial message
  // });



  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();