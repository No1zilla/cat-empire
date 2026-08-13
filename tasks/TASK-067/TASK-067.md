# 📌 TASK-067: Retention-метрики — D1 / D7 / D30 (Удержание игроков)

> **Статус:** 🔲 В ОЧЕРЕДИ
> **Приоритет:** Высокий (P1 — ключевая метрика для монетизации и роста)
> **Зависит от:** TASK-066 (EventTracker)

---

## 🎯 Цель
Считать и хранить retention-метрики для каждого игрока: вернулся ли он на Day 1, Day 7, Day 30 после первого запуска.

## 📐 Метрики

| Метрика | Описание | Хороший показатель для merge-игр |
|---------|----------|----------------------------------|
| **D1 Retention** | % игроков вернувшихся на следующий день | > 35% |
| **D7 Retention** | % игроков вернувшихся через неделю | > 15% |
| **D30 Retention** | % игроков через месяц | > 5% |
| **Avg Session Length** | Средняя длина сессии | > 4 минуты |
| **Sessions per DAU** | Кол-во сессий в день на активного игрока | > 2 |

## 🛠 Реализация

### Railway API: таблица `user_sessions`
```sql
CREATE TABLE user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_count INTEGER DEFAULT 1,
  d1_returned BOOLEAN DEFAULT FALSE,
  d7_returned BOOLEAN DEFAULT FALSE,
  d30_returned BOOLEAN DEFAULT FALSE
);
```

### Логика на Railway (при каждом `session_start`)
1. Если `user_id` новый → создать запись (`first_seen_at = now`)
2. Если `user_id` существует → обновить `last_seen_at`, `session_count++`
3. Посчитать `days_since_first = (now - first_seen_at) / 86400`
4. Если `days_since_first >= 1` → `d1_returned = true`
5. Если `days_since_first >= 7` → `d7_returned = true`
6. Если `days_since_first >= 30` → `d30_returned = true`

### Railway API: `GET /analytics/retention`
Возвращает агрегированные retention-метрики:
```json
{
  "total_users": 1250,
  "d1_retention": 0.42,
  "d7_retention": 0.18,
  "d30_retention": 0.07,
  "avg_session_length_sec": 287,
  "avg_sessions_per_dau": 2.4
}
```

## ✅ Критерии приёмки
- [ ] Таблица `user_sessions` создана через миграцию
- [ ] При каждом `session_start` обновляется запись пользователя
- [ ] D1/D7/D30 флаги проставляются автоматически
- [ ] `GET /analytics/retention` возвращает актуальные данные
- [ ] Данные по retention видны в Railway Metrics или простом JSON эндпоинте
