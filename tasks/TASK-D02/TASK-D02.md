# 📌 TASK-D02: Деплой бэкенда на Render / Localtunnel (HTTPS)

> **Статус:** 🟢 Выполнено
> **Зависимости:** TASK-D01 (нужен `VK_APP_SECRET`)
> **Ожидаемое время:** 10–15 минут

---

## 🎯 Цель

Выложить Node.js/Express бэкенд на хостинг или HTTPS тоннель, чтобы сервер был доступен по протоколу HTTPS.

---

## 📋 Публичный URL бэкенда

- **HTTPS URL**: `https://famous-geckos-shine.loca.lt`
- **BASE_URL**: `https://famous-geckos-shine.loca.lt/api`

---

## 🔧 Обновление фронтенда

В файле `cat-empire/src/api/client.js` обновлён адрес сервера на HTTPS-адрес:

```javascript
// src/api/client.js
const BASE_URL = 'https://famous-geckos-shine.loca.lt/api';
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Бэкенд задеплоен и доступен по HTTPS |
| 2 | `src/api/client.js` обновлён новым `BASE_URL` |
| 3 | HTTPS доступен и валиден (требование VK Mini Apps) |

## 📎 Что принести на ревью

- Публичный URL вашего бэкенда: `https://famous-geckos-shine.loca.lt`
