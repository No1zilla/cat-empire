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
// Railway использует динамический PORT — обязательно читаем из env
const PORT = process.env.PORT || 3001;

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

// Запуск сервера — слушаем на 0.0.0.0 для Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер «Империя Котиков» запущен на порту ${PORT}`);
});
