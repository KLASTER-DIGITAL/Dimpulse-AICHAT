import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketServer } from 'ws'; // Added import for WebSocketServer
import { migrateDatabase } from "./migration"; // Импорт функции миграции
import { registerUser } from "./auth"; // Импорт функции регистрации пользователя
import { isSupabaseConfigured, testSupabaseConnection } from "./supabase"; // Импорт функций для проверки Supabase
import { storage } from "./storage"; // Импорт хранилища данных


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
    
    // Создаем администратора, если Supabase настроен
    if (isSupabaseConfigured()) {
      // Проверяем соединение с Supabase
      const isConnected = await testSupabaseConnection();
      
      if (isConnected) {
        console.log('Creating admin user...');
        try {
          // Проверяем, существует ли пользователь с именем admin
          const existingUser = await storage.getUserByUsername('admin');
          
          if (!existingUser) {
            // Вместо регистрации через Supabase Auth, создаем пользователя напрямую в нашей таблице
            console.log('Creating admin user directly in database...');
            
            try {
              // Создаем запись в нашей таблице пользователей
              const admin = await storage.createUser({
                username: 'admin',
                password: 'admin123' // В реальном приложении пароль должен быть хэширован
              });
              
              if (admin) {
                console.log('Admin user created successfully in storage:', admin.username);
              } else {
                console.error('Failed to create admin user in storage');
              }
            } catch (storageError) {
              console.error('Error creating admin user in storage:', storageError);
            }
          } else {
            console.log('Admin user already exists');
          }
        } catch (adminError) {
          console.error('Error creating admin user:', adminError);
        }
      } else {
        console.error('Failed to connect to Supabase, skipping admin user creation');
      }
    } else {
      console.log('Supabase not configured, skipping admin user creation');
    }
  } catch (error) {
    console.error('Database migration failed:', error);
  }
  
  const server = await registerRoutes(app);

  const wss = new WebSocketServer({ 
    server, 
    clientTracking: true, 
    path: '/ws',
    perMessageDeflate: false // Disable compression to reduce overhead
  });

  const clients = new Set();

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log('WebSocket connected', {
      headers: {
        host: req.headers.host,
        origin: req.headers.origin
      }
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    }));

    // Setup ping-pong
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle messages based on type
        if (data.type === 'join') {
          ws.send(JSON.stringify({
            type: 'joined',
            chatId: data.chatId,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (err) {
        console.error('Failed to process message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Cleanup dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });



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