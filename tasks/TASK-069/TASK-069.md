# 📌 TASK-069: Геймплей-аналитика — Прогресс, Воронка, Поведение игрока

> **Статус:** 🔲 В ОЧЕРЕДИ
> **Приоритет:** Высокий (P1 — понять где игрок застревает и уходит)
> **Зависит от:** TASK-066 (EventTracker)

---

## 🎯 Цель
Понять игровое поведение: какой максимальный уровень котика достигают игроки, как часто используются разные кнопки, где игрок «застревает» и бросает игру.

## 📐 Ключевые геймплей-метрики

### Прогресс (Depth Metrics)
| Метрика | Описание |
|---------|----------|
| **Max Cat Level Distribution** | % игроков достигших каждого уровня (1-10+) |
| **Avg Max Cat Level @ D1/D7** | Средний макс уровень к концу 1-го / 7-го дня |
| **Total Merges per Session** | Среднее кол-во слияний за сессию |
| **Time to First Level 5 Cat** | Сколько минут до первого котика 5-го уровня |

### Воронка вовлечённости (Engagement Funnel)
```
Запустил игру (session_start)
    ↓ (??% дошли)
Купил первого котика (cat_bought, count=1)
    ↓ (??% дошли)
Сделал первое ручное слияние (merge_manual)
    ↓ (??% дошли)
Досмотрел первую рекламу (ad_completed)
    ↓ (??% дошли)
Использовал авто-слияние (merge_auto_triggered)
    ↓ (??% дошли)
Достиг котика 5-го уровня (max_cat_level_reached, level=5)
```

### Кнопочная аналитика (Button Usage)
| Кнопка | Событие | Что анализируем |
|--------|---------|-----------------|
| 📦 Заполнить | `fill_all_triggered` | Частота использования, % от сессий |
| ⚡ Соединить | `merge_auto_triggered` | Конверсия: видел кнопку → нажал |
| 🐱 Купить | `cat_bought` | Частота одиночных покупок vs заполнить все |

## 🛠 Ключевые SQL-запросы

### Распределение максимальных уровней котиков
```sql
SELECT
  (props->>'level')::int AS max_level,
  COUNT(DISTINCT user_id) AS users_reached,
  ROUND(COUNT(DISTINCT user_id)::numeric /
        (SELECT COUNT(DISTINCT user_id) FROM analytics_events) * 100, 1) AS pct_of_all_users
FROM analytics_events
WHERE event = 'max_cat_level_reached'
GROUP BY max_level
ORDER BY max_level;
```

### Воронка вовлечённости
```sql
WITH funnel AS (
  SELECT
    COUNT(DISTINCT user_id) FILTER (WHERE event = 'session_start') AS started,
    COUNT(DISTINCT user_id) FILTER (WHERE event = 'cat_bought') AS bought_cat,
    COUNT(DISTINCT user_id) FILTER (WHERE event = 'merge_manual') AS merged,
    COUNT(DISTINCT user_id) FILTER (WHERE event = 'ad_completed') AS watched_ad,
    COUNT(DISTINCT user_id) FILTER (WHERE event = 'merge_auto_triggered') AS used_automerge
  FROM analytics_events
)
SELECT
  started,
  bought_cat, ROUND(bought_cat::numeric/started*100,1) AS bought_pct,
  merged, ROUND(merged::numeric/started*100,1) AS merged_pct,
  watched_ad, ROUND(watched_ad::numeric/started*100,1) AS ad_pct,
  used_automerge, ROUND(used_automerge::numeric/started*100,1) AS automerge_pct
FROM funnel;
```

## 🚀 Data-driven решения

- **< 50% дошли до первого слияния** → упростить UI, добавить туториал
- **< 30% досмотрели рекламу** → ценность награды слишком мала, поднять с +5 до +8 гемов
- **< 20% использовали авто-слияние** → кнопка не заметна, изменить дизайн / добавить анимацию
- **Большинство застревает на уровне 3** → добавить подсказку / уменьшить стоимость слияния

## ✅ Критерии приёмки
- [ ] Все геймплей-события трекаются через EventTracker
- [ ] `max_cat_level_reached` трекается при каждом новом максимальном уровне
- [ ] SQL-запросы по воронке сохранены в `/analytics/queries/funnel.sql`
- [ ] `GET /analytics/gameplay` возвращает топ-5 метрик прогресса
