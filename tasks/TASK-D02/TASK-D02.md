# 📌 TASK-D02: Деплой бэкенда на Render / Railway

> **Статус:** 🟡 В работе
> **Зависимости:** TASK-D01 (нужен `VK_APP_SECRET`)
> **Ожидаемое время:** 10–15 минут

---

## 🎯 Цель

Выложить Node.js/Express бэкенд на бесплатный хостинг (например, [Render.com](https.render.com) или [Railway.app](https://railway.app)), чтобы сервер был доступен по протоколу HTTPS.

---

## 📋 Инструкция для Render.com (Бесплатно)

### Шаг 1: Подготовка Git-репозитория
Если проект ещё не в Git:
1. Запушь папку `cat-empire` на GitHub/GitLab.

### Шаг 2: Создание Web Service на Render
1. Зайди на [dashboard.render.com](https://dashboard.render.com/) и нажми **New +** → **Web Service**.
2. Подключи свой GitHub-репозиторий.
3. Укажи следующие параметры:
   - **Name:** `cat-empire-server`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npx prisma db push`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

### Шаг 3: Переменные окружения (Environment Variables)
В настройках Render добавь следующие `Environment Variables`:
- `PORT` = `3001`
- `NODE_ENV` = `production`
- `VK_APP_SECRET` = `ВАШ_ЗАЩИЩЁННЫЙ_КЛЮЧ_ИЗ_TASK-D01`
- `DATABASE_URL` = `file:./dev.db`

### Шаг 4: Получи публичный URL бэкенда
После успешного деплоя Render выдаст URL вида:
`https://cat-empire-server.onrender.com`

---

## 🔧 Обновление фронтенда

В файле `cat-empire/src/api/client.js` замени адрес сервера с `localhost` на полученный HTTPS-адрес:

```javascript
// src/api/client.js
const BASE_URL = 'https://cat-empire-server.onrender.com/api';
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Бэкенд задеплоен и возвращает `200 OK` при `GET https://cat-empire-server.onrender.com/api/health` |
| 2 | `src/api/client.js` обновлён новым `BASE_URL` |
| 3 | HTTPS доступен и валиден (требование VK Mini Apps) |

## 📎 Что принести на ревью

- Публичный URL вашего бэкенда (например: `https://cat-empire-server.onrender.com`)
