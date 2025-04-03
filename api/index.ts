import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { log } from "../server/vite";
import { migrateDatabase } from "../server/migration";
import { isSupabaseConfigured, testSupabaseConnection } from "../server/supabase";
import { storage } from "../server/storage";
import pollingRoutes from "./routes";

// Создаем экземпляр Express
const app = express();

// Увеличиваем лимит размера JSON-запроса для обработки больших файлов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS для Vercel
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware для логирования запросов
app.use((req, res, next) => {
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

// Подключаем маршруты для long polling
app.use('/api/polling', pollingRoutes);

// Инициализация базы данных и маршрутов
(async () => {
  try {
    // Миграция базы данных
    await migrateDatabase();
    
    // Проверка Supabase
    if (isSupabaseConfigured()) {
      const isConnected = await testSupabaseConnection();
      if (isConnected) {
        console.log("Supabase connection successful");
      } else {
        console.log("Supabase connection failed");
      }
    } else {
      console.log("Supabase configuration not found (SUPABASE_URL and SUPABASE_KEY environment variables required)");
      console.log("Falling back to in-memory storage. Set SUPABASE_URL and SUPABASE_KEY for database persistence.");
    }
    
    // Инициализация хранилища
    await storage.initialize();
    console.log(`Storage initialized: ${storage.constructor.name}`);
    
    // Регистрация основных маршрутов
    await registerRoutes(app);
    
    // Обработка ошибок
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });
    
  } catch (error) {
    console.error("Error during initialization:", error);
  }
})();

// Экспорт для Vercel
export default app;
