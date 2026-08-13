-- TASK-068: SQL-запросы для анализа монетизации

-- 1. Fill Rate по типам рекламы за последние 7 дней
SELECT
  props->>'ad_type' AS ad_type,
  COUNT(*) FILTER (WHERE event = 'ad_requested') AS requested,
  COUNT(*) FILTER (WHERE event = 'ad_shown') AS shown,
  COUNT(*) FILTER (WHERE event = 'ad_completed') AS completed,
  ROUND(COUNT(*) FILTER (WHERE event = 'ad_shown')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE event = 'ad_requested'), 0) * 100, 1) AS fill_rate_pct,
  ROUND(COUNT(*) FILTER (WHERE event = 'ad_completed')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE event = 'ad_shown'), 0) * 100, 1) AS completion_rate_pct
FROM analytics_events
WHERE event IN ('ad_requested', 'ad_shown', 'ad_completed')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY ad_type;

-- 2. Среднее количество рекламных просмотров на активного пользователя в день (Ads per DAU)
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
