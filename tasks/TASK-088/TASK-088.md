# 📌 TASK-088: Мёртвый Prisma-слой — `schema.prisma` не совпадает ни с СУБД, ни с таблицей

> **Статус:** ✅ Исправлено — `server/prisma/` удалён
> **Приоритет:** P3 — техдолг, вводит в заблуждение
> **Зависимости:** нет

---

## Проблема

`server/prisma/schema.prisma` описывал SQLite-схему, но реальный бэкенд её не использует **вообще**:

- `@prisma/client` и `prisma` отсутствуют в `server/package.json`
- Ни один файл в `server/src/` не импортирует Prisma (проверено grep'ом)
- `server/src/db.js` работает через `pg.Pool` с ручным SQL и сам создаёт таблицу `CREATE TABLE IF NOT EXISTS users`

Схема разошлась с реальностью по всем осям:

| | `schema.prisma` | Реальная таблица `users` |
|---|---|---|
| СУБД | `provider = "sqlite"` | PostgreSQL |
| Именование | camelCase (`vkId`, `maxCatLevel`) | snake_case (`vk_id`, `max_cat_level`) |
| Поля | нет `totalCatsBought` / `totalCatsCreated` / `totalMerges` | есть, добавлены авто-миграцией |
| Время | `DateTime` | `BIGINT` epoch-секунды |

Из-за этого файл активно вредил: любой, кто открыл бы его первым, решил бы, что проект на SQLite + Prisma, и что схема — источник правды.

## Что сделано

Каталог `server/prisma/` удалён целиком. Источник правды по схеме — `initDB()` в `server/src/db.js`, где таблица и авто-миграции колонок описаны явным SQL.

## Критерии

- [x] `server/prisma/` отсутствует
- [x] В коде и зависимостях ноль упоминаний Prisma
- [x] Бэкенд стартует как раньше (Prisma и не использовался)
