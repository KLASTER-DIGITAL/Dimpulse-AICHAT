import express from "express";
import { registerRoutes } from "../vercel-routes";

// Создаем Express приложение
const app = express();

// Увеличиваем лимит размера JSON-запроса для обработки больших файлов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Настраиваем маршруты
(async () => {
  await registerRoutes(app);
})();

// Запуск приложения на порту 3000 (для Vercel)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Vercel API server listening on port ${port}`);
});

// Экспортируем для Vercel
export default app;