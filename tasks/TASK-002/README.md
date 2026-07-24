# Артефакт выполнения задачи TASK-002: Бэкенд-сервер «Империя Котиков»

## Описание задачи
Разработка бэкенд-сервера на Node.js + Express + Prisma ORM + SQLite, валидация HMAC подписи VK Mini Apps и создание API клиентов.

---

## 📁 Созданная структура файлов

```
cat-empire/
├── src/
│   └── api/
│       └── client.js        — клиентский модуль фронтенда (fetchProfile, saveProgress, fetchLeaderboard)
└── server/
    ├── package.json         — зависимости express, @prisma/client, cors, dotenv, dev: prisma, nodemon
    ├── .env                 — конфигурация DATABASE_URL, PORT=3001, VK_APP_SECRET
    ├── .env.example         — шаблон переменных окружения
    ├── prisma/
    │   ├── schema.prisma    — модель User (vkId BigInt, coins, gems, maxCatLevel, gridState, lastOfflineCheck)
    │   └── dev.db           — SQLite база данных
    └── src/
        ├── index.js         — запуск Express сервера (порт 3001, CORS, BigInt.prototype.toJSON)
        ├── middleware/
        │   └── vkAuth.js    — мидлварь валидации x-vk-sign с dev-моком vkId: 123456
        ├── routes/
        │   ├── user.js      — GET /api/user/profile, POST /api/user/save
        │   └── leaderboard.js — GET /api/leaderboard
        ├── services/
        │   └── userService.js — бизнес-логика: getOrCreateUser (с оффлайн-доходом) и saveUserProgress
        └── utils/
            └── vkCheckSign.js — HMAC SHA256 проверка подписи VK Mini Apps
```

---

## 🌐 Описание API Эндпоинтов

### 1. `GET /api/user/profile`
- **Описание**: Получение или авто-создание профиля игрока.
- **Логика**:
  - Если пользователь новый — создаётся запись с 100 монетами, 10 гемами, `maxCatLevel: 1` и 2 котиками 1-го уровня в сетке (`gridState`).
  - При повторных входах рассчитывается оффлайн-доход с момента `lastOfflineCheck` (до 8 часов).
- **Пример ответа (200 OK)**:
```json
{
  "user": {
    "id": "59523c6a-9bdb-4b88-aa38-3e363e3d392f",
    "vkId": "123456",
    "firstName": "Игрок",
    "lastName": "",
    "avatar": "",
    "coins": 1214,
    "gems": 10,
    "maxCatLevel": 1,
    "gridState": "[{\"slotIndex\":0,\"catLevel\":1},{\"slotIndex\":1,\"catLevel\":1}]",
    "lastOfflineCheck": "2026-07-24T09:54:48.305Z"
  }
}
```

### 2. `POST /api/user/save`
- **Описание**: Сохранение текущего прогресса игрока.
- **Body**: `{ "coins": 250.5, "gems": 15, "maxCatLevel": 3, "gridState": [...] }`.
- **Пример ответа (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "59523c6a-9bdb-4b88-aa38-3e363e3d392f",
    "vkId": "123456",
    "coins": 250.5,
    "gems": 15,
    "maxCatLevel": 3,
    "gridState": "[{\"slotIndex\":0,\"catLevel\":3},{\"slotIndex\":1,\"catLevel\":2}]"
  }
}
```

### 3. `GET /api/leaderboard`
- **Описание**: Получение Топ-10 игроков, отсортированных по уровню котиков и монетам.

---

## ✅ Критерии приёмки и результаты тестирования

| # | Проверка | Статус |
|---|---|---|
| 1 | `npx prisma db push` успешно создаёт SQLite базу | ✅ База `dev.db` создана, клиент сгенерирован |
| 2 | `npm run dev` в папке `server/` запускает Express на порту 3001 | ✅ Запущен на http://localhost:3001 |
| 3 | При запросе `GET /api/user/profile` создаётся пользователь и возвращается JSON | ✅ Проверено (Status 200 OK) |
| 4 | При повторном вызове отдаются сохранённые данные | ✅ Проверено (Status 200 OK + оффлайн-доход) |
| 5 | Функция `vkCheckSign.js` корректно проверяет HMAC подпись VK | ✅ Проверено алгоритмом HMAC SHA256 |
