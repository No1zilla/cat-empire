# 📌 TASK-086: `server/.env.example` врёт про СУБД — SQLite вместо PostgreSQL

> **Статус:** ✅ Исправлено
> **Приоритет:** P2 — сбивает с толку при поднятии бэка с нуля
> **Зависимости:** нет

---

## Проблема

```
DATABASE_URL="file:./dev.db"
```

Это формат SQLite/Prisma, оставшийся от прототипа (см. [TASK-088](../TASK-088/TASK-088.md)). Реальный бэкенд подключается через `pg.Pool`:

```js
// server/src/db.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});
```

С `file:./dev.db` драйвер `pg` не поднимется. На Railway переменная выставляется автоматически при линковке Postgres-плагина, поэтому прод не страдает — ломается только локальный старт по инструкции из примера.

## Что сделано

Заменено на реальный формат с пояснением про Railway:

```
DATABASE_URL="postgresql://user:password@localhost:5432/cat_empire"
```

## Критерии

- [x] В примере валидный Postgres connection string
- [x] Отмечено, что на Railway переменная приходит сама
