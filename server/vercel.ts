import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { storagePromise } from './storage';
import { registerRoutes } from './vercel-routes';

// Настройка Express приложения
const app = express();

// Разрешаем CORS для всех доменов при деплое
app.use(cors());

// Увеличиваем размер разрешенного JSON для загрузки файлов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Настройка маршрутов API
(async () => {
  // Ожидаем инициализацию хранилища
  await storagePromise;
  
  // Регистрируем маршруты
  await registerRoutes(app);
})();

// Обработка ошибок
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Экспортируем для Vercel
export default app;