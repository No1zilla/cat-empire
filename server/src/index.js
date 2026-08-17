import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import userRouter from './routes/user.js';
import leaderboardRouter from './routes/leaderboard.js';
import eventsRouter from './routes/events.js';
import analyticsRouter from './routes/analytics.js';
import adminRouter from './routes/admin.js';
import paymentsRouter, { replyVkPayment, isVkPaymentPayload } from './routes/payments.js';

// Загрузка переменных окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Статический админский дашборд (TASK-070)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Базовый роут проверки работы бэкенда
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// VK Payments: кабинет часто вставляет домен без /api/payments/vk — HTML 404 ломает get_item.
app.post('/', replyVkPayment);
app.get('/', (req, res) => {
  if (isVkPaymentPayload(req)) return replyVkPayment(req, res);
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    payments: '/api/payments/vk'
  });
});

// Подключение основных маршрутов API
app.use('/api/user', userRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/events', eventsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentsRouter);

app.use((req, res) => {
  res.status(404).json({
    error: { error_code: 11, error_msg: 'Not found' },
    payments: '/api/payments/vk'
  });
});

// Запуск сервера — слушаем на 0.0.0.0 для Railway (v1.1.0 - Analytics & Admin Dashboard)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер «Империя Котиков» v1.1.0 запущен на порту ${PORT}`);
});
