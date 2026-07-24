import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRouter from './routes/user.js';
import leaderboardRouter from './routes/leaderboard.js';

// Загрузка переменных окружения
dotenv.config();

// Поддержка сериализации BigInt в JSON
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.PORT || 3099;

// Настройка middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Базовый роут проверки работы бэкенда
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Подключение основных маршрутов API
app.use('/api/user', userRouter);
app.use('/api/leaderboard', leaderboardRouter);

// Запуск сервера для локальной разработки
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер «Империя Котиков» запущен на http://localhost:${PORT}`);
  });
}

export default app;
