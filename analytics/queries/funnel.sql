-- TASK-069: SQL-запросы для анализа геймплейной воронки вовлечения

-- 1. Воронка конверсии игроков по ключевым действиям
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
  bought_cat, ROUND(bought_cat::numeric / NULLIF(started, 0) * 100, 1) AS bought_pct,
  merged, ROUND(merged::numeric / NULLIF(started, 0) * 100, 1) AS merged_pct,
  watched_ad, ROUND(watched_ad::numeric / NULLIF(started, 0) * 100, 1) AS ad_pct,
  used_automerge, ROUND(used_automerge::numeric / NULLIF(started, 0) * 100, 1) AS automerge_pct
FROM funnel;

-- 2. Распределение максимального открытого уровня котиков среди игроков
SELECT
  (props->>'level')::int AS max_level,
  COUNT(DISTINCT user_id) AS users_reached,
  ROUND(COUNT(DISTINCT user_id)::numeric /
        NULLIF((SELECT COUNT(DISTINCT user_id) FROM analytics_events), 0) * 100, 1) AS pct_of_all_users
FROM analytics_events
WHERE event = 'max_cat_level_reached'
GROUP BY max_level
ORDER BY max_level;
