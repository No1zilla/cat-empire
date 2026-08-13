# 📌 TASK-068: Монетизация-аналитика — Реклама, ARPU, eCPM

> **Статус:** ✅ ВЫПОЛНЕНО И ВЕРИФИЦИРОВАНО
> **Приоритет:** Высокий (P1 — прямое влияние на доход)
> **Зависит от:** TASK-066 (EventTracker)

---

## 🎯 Цель
Отслеживать всю рекламную воронку: от момента запроса рекламы до успешного начисления награды. Считать ARPU, Fill Rate, Completion Rate.

## 📐 Ключевые метрики монетизации

| Метрика | Формула | Целевое значение |
|---------|---------|-----------------|
| **Ad Fill Rate** | `ad_shown / ad_requested` | > 80% |
| **Ad Completion Rate** | `ad_completed / ad_shown` | > 90% |
| **Ads per DAU** | `ad_completed / DAU` | > 3 |
| **ARPU** | `total_revenue / total_users` (из VK Ad Network) | рост MoM |
| **Rewarded CTR** | `ad_clicked / ad_shown` | — |

## 📦 Рекламная воронка (события из TASK-066)

```
ad_requested
    ↓
ad_shown (Fill Rate = shown/requested)
    ↓
ad_completed (Completion Rate = completed/shown)
    ↓
reward_granted (+5 💎)
```

### Точки провала воронки:
- `ad_failed` — VK не нашёл рекламодателя (низкий Fill Rate)
- `ad_skipped` — игрок закрыл рекламу до конца (низкий Completion Rate)

## 🛠 Аналитические запросы на PostgreSQL

### Fill Rate по типам рекламы
```sql
SELECT
  props->>'ad_type' AS ad_type,
  COUNT(*) FILTER (WHERE event = 'ad_requested') AS requested,
  COUNT(*) FILTER (WHERE event = 'ad_shown') AS shown,
  ROUND(COUNT(*) FILTER (WHERE event = 'ad_shown')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE event = 'ad_requested'), 0) * 100, 1) AS fill_rate_pct
FROM analytics_events
WHERE event IN ('ad_requested', 'ad_shown')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY ad_type;
```

### Среднее кол-во реклам на пользователя в день
```sql
SELECT
  DATE(created_at) AS day,
  COUNT(DISTINCT user_id) AS dau,
  COUNT(*) FILTER (WHERE event = 'ad_completed') AS completions,
  ROUND(COUNT(*) FILTER (WHERE event = 'ad_completed')::numeric /
        NULLIF(COUNT(DISTINCT user_id), 0), 2) AS ads_per_dau
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

## 🚀 Data-driven решения на основе этих метрик

- **Fill Rate < 60%** → сменить формат рекламы, уточнить таргетинг в VK Ad Network
- **Completion Rate < 85%** → пересмотреть UX рекламного экрана (может слишком раздражает)
- **Ads per DAU < 2** → добавить больше точек вызова рекламы (офлайн-бонус, ежедневная награда)
- **Высокий fill_free, низкий auto_merge** → пересмотреть стоимость auto-merge или добавить рекламу перед авто-слиянием

## ✅ Критерии приёмки
- [ ] События `ad_requested`, `ad_shown`, `ad_completed`, `ad_failed`, `ad_skipped` трекаются в `AdModal.js`
- [ ] `GET /analytics/monetization` возвращает Fill Rate и Completion Rate за 7/30 дней
- [ ] Данные доступны для просмотра (SQL-запросы сохранены в `/analytics/queries/`)
