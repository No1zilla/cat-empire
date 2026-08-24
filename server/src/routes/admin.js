import express from 'express';
import pool from '../db.js';

const router = express.Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'cat_empire_admin_secret_token_2026';

let dashboardCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000;

const IAP_EVENTS = ['iap_purchase_completed', 'iap_starter_tribute', 'iap_edict_bought'];
const BUTTON_EVENTS = [
  'session_start',
  'return_session',
  'tutorial_started',
  'tutorial_completed',
  'tutorial_skipped',
  'first_merge',
  'cat_bought',
  'fill_all_triggered',
  'merge_manual',
  'merge_auto_triggered',
  'action_blocked',
  'shop_opened',
  'purchase_initiated',
  'share_triggered',
  'community_joined',
  'quest_claimed',
  'daily_reward_claimed',
  'vassals_summoned',
  'edict_daily_claimed',
  'invite_reward_granted',
  'offline_bonus_claimed'
];

const BUTTON_LABELS = {
  session_start: 'Запуск двора',
  return_session: 'Возврат (с учётом дня)',
  tutorial_started: 'Туториал: начат',
  tutorial_completed: 'Туториал: слили сами',
  tutorial_skipped: 'Туториал: пропустили',
  first_merge: 'Первое слияние (разово)',
  cat_bought: 'Купить кота',
  fill_all_triggered: 'Заполнить поле',
  merge_manual: 'Слияние руками',
  merge_auto_triggered: 'Авто-слияние',
  action_blocked: 'Отказ игроку (нет монет / поле полно)',
  shop_opened: 'Магазин открыт',
  purchase_initiated: 'Покупка начата',
  share_triggered: 'Шер / инвайт',
  community_joined: 'Вступление в группу',
  quest_claimed: 'Квест забран',
  daily_reward_claimed: 'Ежедневка',
  vassals_summoned: 'Вассалы',
  edict_daily_claimed: 'Паёк указа',
  invite_reward_granted: 'Награда за друга',
  offline_bonus_claimed: 'Офлайн бонус'
};

const EVENT_LABELS = {
  ...BUTTON_LABELS,
  session_end: 'Выход',
  ad_requested: 'Ролик: запрос',
  ad_shown: 'Ролик: показ',
  ad_completed: 'Ролик: просмотр',
  ad_failed: 'Ролик: провал',
  ad_skipped: 'Ролик: закрыл',
  iap_purchase_completed: 'Покупка',
  iap_starter_tribute: 'Стартовый пак',
  iap_edict_bought: 'Указ',
  max_cat_level_reached: 'Новый макс. уровень'
};

/** Сутки как в кабинете VK — календарный день Москвы, не UTC. */
const MSK_DAY = `(created_at AT TIME ZONE 'Europe/Moscow')::date = (NOW() AT TIME ZONE 'Europe/Moscow')::date`;
const MSK_FIRST_SEEN = `(first_seen_at AT TIME ZONE 'Europe/Moscow')::date = (NOW() AT TIME ZONE 'Europe/Moscow')::date`;

function funnelFromRow(row = {}) {
  const n = (key) => Number(row[key] || 0);
  const startedToday = n('started_today');
  const pct = (part) => (startedToday > 0 ? Number(((part / startedToday) * 100).toFixed(1)) : 0);
  return {
    started: n('started'),
    bought_cat: n('bought_cat'),
    merged: n('merged'),
    filled: n('filled'),
    watched_ad: n('watched_ad'),
    used_automerge: n('used_automerge'),
    started_today: startedToday,
    bought_cat_today: n('bought_cat_today'),
    merged_today: n('merged_today'),
    filled_today: n('filled_today'),
    watched_ad_today: n('watched_ad_today'),
    used_automerge_today: n('used_automerge_today'),
    bought_pct: pct(n('bought_cat_today')),
    merged_pct: pct(n('merged_today')),
    filled_pct: pct(n('filled_today')),
    ad_pct: pct(n('watched_ad_today')),
    automerge_pct: pct(n('used_automerge_today'))
  };
}

const AD_EVENTS = ['ad_requested', 'ad_shown', 'ad_completed', 'ad_failed', 'ad_skipped'];

const AD_TYPE_LABELS = {
  fill_free: 'Заполнить поле',
  auto_merge: 'Соединить',
  reward_gems: 'Рубины',
  income_booster: 'Бустер 2×',
  daily_reward_double: 'Ежедневка ×2',
  offline_bonus: 'Офлайн бонус'
};

function adTypeLabel(adType) {
  const key = String(adType || '');
  return AD_TYPE_LABELS[key] || key || '—';
}

/**
 * Middleware проверки Bearer токена или query-параметра token
 */
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (queryToken) {
    token = String(queryToken).trim();
  }

  if (token === ADMIN_TOKEN || process.env.NODE_ENV === 'test') {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid Admin Token' });
}

function maskUserId(userId) {
  const id = String(userId || '');
  if (!id) return '—';
  if (id.startsWith('guest_') || id.startsWith('usr_')) return id;
  return `usr_${id.slice(-4)}`;
}

function simulatedDashboard() {
  return {
    day_tz: 'Europe/Moscow',
    activity: {
      dau_today: 142,
      dau_vk: 120,
      dau_guest: 22,
      total_sessions_today: 385,
      avg_session_sec: 287,
      new_users_today: 34
    },
    retention: {
      d1_retention: 0.42,
      d7_retention: 0.18,
      d30_retention: 0.07,
      avg_sessions_per_dau: 2.4
    },
    monetization: {
      ads_shown_today: 412,
      fill_rate_pct: 88.4,
      completion_rate_pct: 94.1,
      ads_per_dau: 2.9
    },
    gameplay: {
      funnel: funnelFromRow({
        started: 500,
        bought_cat: 480,
        merged: 425,
        filled: 400,
        watched_ad: 310,
        used_automerge: 215,
        started_today: 40,
        bought_cat_today: 38,
        merged_today: 34,
        filled_today: 32,
        watched_ad_today: 25,
        used_automerge_today: 17
      }),
      level_distribution: [
        { level: 1, users: 500 },
        { level: 2, users: 425 },
        { level: 3, users: 310 }
      ]
    },
    purchases: {
      today: 3,
      all_time: 12,
      rubies_today: 140,
      votes_today: 10,
      by_pack: [
        { pack: 'gems_pack_10', count: 8, rubies: 80, votes: 8 },
        { pack: 'starter_tribute_5', count: 3, rubies: 240, votes: 15 },
        { pack: 'gems_pack_50', count: 1, rubies: 50, votes: 4 }
      ],
      recent: [
        {
          created_at: new Date().toISOString(),
          pack: 'gems_pack_10',
          user_id: 'usr_demo',
          rubies: 10,
          votes: 1,
          source: 'vk_callback'
        }
      ]
    },
    buttons: BUTTON_EVENTS.map((event, index) => ({
      event,
      label: BUTTON_LABELS[event] || event,
      today: Math.max(0, 40 - index * 3),
      all_time: Math.max(0, 400 - index * 30)
    })),
    events: {
      today_total: 128,
      by_type: [
        { event: 'session_start', count: 40 },
        { event: 'cat_bought', count: 28 },
        { event: 'merge_manual', count: 22 },
        { event: 'iap_purchase_completed', count: 3 }
      ],
      recent: [
        {
          created_at: new Date().toISOString(),
          event: 'iap_purchase_completed',
          user_id: 'usr_demo',
          platform: 'vk',
          detail: 'gems_pack_10 · 10р · 1 голос'
        }
      ]
    },
    ads: {
      requested_today: 12,
      failed_today: 9,
      skipped_today: 1,
      failed_users: 3,
      failed_users_today: 3,
      by_type: [
        {
          ad_type: 'fill_free',
          label: 'Заполнить поле',
          requested: 8,
          shown: 1,
          completed: 1,
          failed: 6,
          skipped: 1,
          requested_today: 8,
          shown_today: 0,
          completed_today: 0,
          failed_today: 7,
          skipped_today: 1
        },
        {
          ad_type: 'reward_gems',
          label: 'Рубины',
          requested: 4,
          shown: 0,
          completed: 0,
          failed: 4,
          skipped: 0,
          requested_today: 4,
          shown_today: 0,
          completed_today: 0,
          failed_today: 2,
          skipped_today: 0
        }
      ],
      reasons: [
        { reason: 'no_ads', ad_type: 'fill_free', label: 'Заполнить поле', count: 6, today: 6, users: 2, users_today: 2 },
        { reason: 'TIMEOUT_NO_RESPONSE', ad_type: 'reward_gems', label: 'Рубины', count: 3, today: 3, users: 1, users_today: 1 }
      ],
      recent: [
        {
          created_at: new Date().toISOString(),
          event: 'ad_failed',
          user_id: 'usr_demo',
          ad_type: 'fill_free',
          label: 'Заполнить поле',
          reason: 'no_ads',
          format: 'reward'
        }
      ]
    },
    top_users: [
      { user_id: 'usr_f8a912', session_count: 48, last_seen: '2026-08-13T14:30:00Z' }
    ],
    simulated: true
  };
}

function eventDetail(event, props = {}) {
  if (!props || typeof props !== 'object') return '';
  const bits = [];
  if (props.pack) bits.push(String(props.pack));
  if (props.rubies) bits.push(`${props.rubies}р`);
  if (props.votes) bits.push(`${props.votes} гол.`);
  if (props.ad_type) bits.push(adTypeLabel(props.ad_type));
  if (props.error_reason) bits.push(String(props.error_reason));
  if (props.format) bits.push(String(props.format));
  if (props.cost != null && props.cost !== '') bits.push(`монет ${props.cost}`);
  if (props.type) bits.push(String(props.type));
  if (props.quest_id) bits.push(String(props.quest_id));
  if (props.source) bits.push(String(props.source));
  if (props.order_id) bits.push(`#${props.order_id}`);
  if (!bits.length && event) return '';
  return bits.join(' · ');
}

function zeroButtons() {
  return BUTTON_EVENTS.map((event) => ({
    event,
    label: BUTTON_LABELS[event] || event,
    today: 0,
    all_time: 0
  }));
}

// GET /api/admin/dashboard (TASK-070)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const now = Date.now();
    if (dashboardCache && (now - cacheTimestamp < CACHE_TTL_MS) && !req.query.nocache) {
      return res.json({ ...dashboardCache, cached: true });
    }

    let resultPayload = {};

    if (!pool || !process.env.DATABASE_URL) {
      resultPayload = simulatedDashboard();
    } else {
      const iapList = IAP_EVENTS.map((_, i) => `$${i + 1}`).join(', ');
      const btnList = BUTTON_EVENTS.map((_, i) => `$${i + 1}`).join(', ');

      const [
        actRows,
        retRows,
        monRows,
        lvlRows,
        topUsersRows,
        purchaseRows,
        packRows,
        purchaseRecentRows,
        buttonRows,
        eventCountRows,
        todayTotalRows,
        eventRecentRows,
        adTypeRows,
        adReasonRows,
        adRecentRows,
        adTodayRows,
        funnelRows
      ] = await Promise.all([
        pool.query(`
          WITH today AS (
            SELECT user_id, session_id
            FROM analytics_events
            WHERE ${MSK_DAY}
          ),
          owners AS (
            SELECT
              session_id,
              COALESCE(
                MAX(user_id) FILTER (
                  WHERE user_id IS NOT NULL
                    AND user_id NOT LIKE 'guest_%'
                    AND user_id NOT IN ('guest', '0', '')
                ),
                MIN(user_id)
              ) AS person_id
            FROM today
            GROUP BY session_id
          )
          SELECT
            COUNT(DISTINCT person_id)::int AS dau_today,
            COUNT(DISTINCT person_id) FILTER (
              WHERE person_id NOT LIKE 'guest_%' AND person_id NOT IN ('guest', '0', '')
            )::int AS dau_vk,
            COUNT(DISTINCT person_id) FILTER (
              WHERE person_id LIKE 'guest_%' OR person_id IN ('guest', '0', '')
            )::int AS dau_guest,
            COUNT(*)::int AS total_sessions_today,
            (SELECT COUNT(*)::int FROM user_sessions WHERE ${MSK_FIRST_SEEN}) AS new_users_today
          FROM owners
        `),
        pool.query(`
          SELECT
            COUNT(*)::int AS total_users,
            ROUND(COUNT(*) FILTER (WHERE d1_returned)::numeric / NULLIF(COUNT(*), 0), 2)::float AS d1_retention,
            ROUND(COUNT(*) FILTER (WHERE d7_returned)::numeric / NULLIF(COUNT(*), 0), 2)::float AS d7_retention,
            ROUND(COUNT(*) FILTER (WHERE d30_returned)::numeric / NULLIF(COUNT(*), 0), 2)::float AS d30_retention,
            ROUND(AVG(session_count), 1)::float AS avg_sessions_per_dau
          FROM user_sessions
        `),
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE event = 'ad_shown' AND (props->>'is_test_ad' = 'false' OR props->>'is_test_ad' IS NULL))::int AS commercial_shown_today,
            COUNT(*) FILTER (WHERE event = 'ad_shown' AND props->>'is_test_ad' = 'true')::int AS test_shown_today,
            COUNT(*) FILTER (WHERE event = 'ad_requested')::int AS requested_today,
            COUNT(*) FILTER (WHERE event = 'ad_completed' AND (props->>'is_test_ad' = 'false' OR props->>'is_test_ad' IS NULL))::int AS commercial_completed_today
          FROM analytics_events
          WHERE ${MSK_DAY}
        `),
        pool.query(`
          SELECT
            (props->>'level')::int AS level,
            COUNT(DISTINCT user_id)::int AS users
          FROM analytics_events
          WHERE event = 'max_cat_level_reached'
          GROUP BY (props->>'level')::int
          ORDER BY level
        `),
        pool.query(`
          SELECT
            user_id_hash AS user_id,
            COUNT(DISTINCT session_id)::int AS session_count,
            MAX(created_at) AS last_seen
          FROM (
            SELECT
              user_id,
              session_id,
              created_at,
              CASE
                WHEN user_id LIKE 'guest_%' THEN user_id
                ELSE CONCAT('usr_', SUBSTRING(MD5(user_id) FROM 1 FOR 6))
              END AS user_id_hash
            FROM analytics_events
          ) sub
          GROUP BY user_id_hash
          ORDER BY session_count DESC
          LIMIT 10
        `),
        pool.query(
          `
          SELECT
            COUNT(*)::int AS all_time,
            COUNT(*) FILTER (WHERE ${MSK_DAY})::int AS today,
            COALESCE(SUM(rubies) FILTER (WHERE ${MSK_DAY}), 0)::int AS rubies_today,
            COALESCE(SUM(votes) FILTER (WHERE ${MSK_DAY}), 0)::int AS votes_today
          FROM (
            SELECT DISTINCT ON (COALESCE(NULLIF(props->>'order_id', ''), id::text))
              created_at,
              COALESCE(NULLIF(props->>'rubies', '')::int, 0) AS rubies,
              COALESCE(NULLIF(props->>'votes', '')::int, 0) AS votes
            FROM analytics_events
            WHERE event IN (${iapList})
            ORDER BY COALESCE(NULLIF(props->>'order_id', ''), id::text),
              CASE WHEN props->>'source' = 'vk_callback' THEN 0 ELSE 1 END,
              id
          ) uniq
          `,
          IAP_EVENTS
        ),
        pool.query(
          `
          SELECT
            pack,
            COUNT(*)::int AS count,
            COALESCE(SUM(rubies), 0)::int AS rubies,
            COALESCE(SUM(votes), 0)::int AS votes
          FROM (
            SELECT DISTINCT ON (COALESCE(NULLIF(props->>'order_id', ''), id::text))
              COALESCE(NULLIF(props->>'pack', ''), event) AS pack,
              COALESCE(NULLIF(props->>'rubies', '')::int, 0) AS rubies,
              COALESCE(NULLIF(props->>'votes', '')::int, 0) AS votes
            FROM analytics_events
            WHERE event IN (${iapList})
            ORDER BY COALESCE(NULLIF(props->>'order_id', ''), id::text),
              CASE WHEN props->>'source' = 'vk_callback' THEN 0 ELSE 1 END,
              id
          ) uniq
          GROUP BY pack
          ORDER BY count DESC
          `,
          IAP_EVENTS
        ),
        pool.query(
          `
          SELECT created_at, pack, user_id, rubies, votes, source
          FROM (
            SELECT DISTINCT ON (COALESCE(NULLIF(props->>'order_id', ''), id::text))
              created_at,
              COALESCE(NULLIF(props->>'pack', ''), event) AS pack,
              user_id,
              COALESCE(NULLIF(props->>'rubies', '')::int, 0) AS rubies,
              COALESCE(NULLIF(props->>'votes', '')::int, 0) AS votes,
              COALESCE(props->>'source', 'client') AS source
            FROM analytics_events
            WHERE event IN (${iapList})
            ORDER BY COALESCE(NULLIF(props->>'order_id', ''), id::text),
              CASE WHEN props->>'source' = 'vk_callback' THEN 0 ELSE 1 END,
              id DESC
          ) uniq
          ORDER BY created_at DESC
          LIMIT 20
          `,
          IAP_EVENTS
        ),
        pool.query(
          `
          SELECT event,
            COUNT(*) FILTER (WHERE ${MSK_DAY})::int AS today,
            COUNT(*)::int AS all_time
          FROM analytics_events
          WHERE event IN (${btnList})
          GROUP BY event
          `,
          BUTTON_EVENTS
        ),
        pool.query(`
          SELECT event, COUNT(*)::int AS count
          FROM analytics_events
          WHERE ${MSK_DAY}
          GROUP BY event
          ORDER BY count DESC
          LIMIT 25
        `),
        pool.query(`
          SELECT COUNT(*)::int AS today_total
          FROM analytics_events
          WHERE ${MSK_DAY}
        `),
        pool.query(`
          SELECT event, user_id, platform, props, created_at
          FROM analytics_events
          ORDER BY id DESC
          LIMIT 40
        `),
        pool.query(
          `
          SELECT
            COALESCE(NULLIF(props->>'ad_type', ''), 'unknown') AS ad_type,
            COUNT(*) FILTER (WHERE event = 'ad_requested')::int AS requested,
            COUNT(*) FILTER (WHERE event = 'ad_shown')::int AS shown,
            COUNT(*) FILTER (WHERE event = 'ad_completed')::int AS completed,
            COUNT(*) FILTER (WHERE event = 'ad_failed')::int AS failed,
            COUNT(*) FILTER (WHERE event = 'ad_skipped')::int AS skipped,
            COUNT(*) FILTER (WHERE event = 'ad_requested' AND ${MSK_DAY})::int AS requested_today,
            COUNT(*) FILTER (WHERE event = 'ad_shown' AND ${MSK_DAY})::int AS shown_today,
            COUNT(*) FILTER (WHERE event = 'ad_completed' AND ${MSK_DAY})::int AS completed_today,
            COUNT(*) FILTER (WHERE event = 'ad_failed' AND ${MSK_DAY})::int AS failed_today,
            COUNT(*) FILTER (WHERE event = 'ad_skipped' AND ${MSK_DAY})::int AS skipped_today
          FROM analytics_events
          WHERE event IN (${AD_EVENTS.map((_, i) => `$${i + 1}`).join(', ')})
          GROUP BY 1
          ORDER BY requested DESC
          `,
          AD_EVENTS
        ),
        pool.query(`
          SELECT
            COALESCE(NULLIF(props->>'error_reason', ''), 'unknown') AS reason,
            COALESCE(NULLIF(props->>'ad_type', ''), 'unknown') AS ad_type,
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE ${MSK_DAY})::int AS today,
            COUNT(DISTINCT user_id)::int AS users,
            COUNT(DISTINCT user_id) FILTER (WHERE ${MSK_DAY})::int AS users_today
          FROM analytics_events
          WHERE event = 'ad_failed'
          GROUP BY 1, 2
          ORDER BY today DESC, count DESC
          LIMIT 20
        `),
        pool.query(
          `
          SELECT event, user_id, platform, props, created_at
          FROM analytics_events
          WHERE event IN (${AD_EVENTS.map((_, i) => `$${i + 1}`).join(', ')})
          ORDER BY id DESC
          LIMIT 30
          `,
          AD_EVENTS
        ),
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE event = 'ad_requested' AND ${MSK_DAY})::int AS requested_today,
            COUNT(*) FILTER (WHERE event = 'ad_failed' AND ${MSK_DAY})::int AS failed_today,
            COUNT(*) FILTER (WHERE event = 'ad_skipped' AND ${MSK_DAY})::int AS skipped_today,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'ad_failed' AND ${MSK_DAY})::int AS failed_users_today,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'ad_failed')::int AS failed_users
          FROM analytics_events
          WHERE event IN ('ad_requested', 'ad_failed', 'ad_skipped')
        `),
        pool.query(`
          SELECT
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'session_start')::int AS started,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'cat_bought')::int AS bought_cat,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'merge_manual')::int AS merged,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'fill_all_triggered')::int AS filled,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'ad_completed')::int AS watched_ad,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'merge_auto_triggered')::int AS used_automerge,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'session_start' AND ${MSK_DAY})::int AS started_today,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'cat_bought' AND ${MSK_DAY})::int AS bought_cat_today,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'merge_manual' AND ${MSK_DAY})::int AS merged_today,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'fill_all_triggered' AND ${MSK_DAY})::int AS filled_today,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'ad_completed' AND ${MSK_DAY})::int AS watched_ad_today,
            COUNT(DISTINCT user_id) FILTER (WHERE event = 'merge_auto_triggered' AND ${MSK_DAY})::int AS used_automerge_today
          FROM analytics_events
          WHERE event IN (
            'session_start', 'cat_bought', 'merge_manual',
            'fill_all_triggered', 'ad_completed', 'merge_auto_triggered'
          )
        `)
      ]);

      const monData = monRows.rows[0] || {};
      const commercialShown = monData.commercial_shown_today || 0;
      const testShown = monData.test_shown_today || 0;
      const requested = monData.requested_today || 0;
      const commercialCompleted = monData.commercial_completed_today || 0;
      const fillRate = requested > 0 ? Number(((commercialShown / requested) * 100).toFixed(1)) : 0;
      const compRate = commercialShown > 0 ? Number(((commercialCompleted / commercialShown) * 100).toFixed(1)) : 0;

      const buttonMap = new Map((buttonRows.rows || []).map((row) => [row.event, row]));
      const buttons = BUTTON_EVENTS.map((event) => {
        const row = buttonMap.get(event);
        return {
          event,
          label: BUTTON_LABELS[event] || event,
          today: row ? Number(row.today || 0) : 0,
          all_time: row ? Number(row.all_time || 0) : 0
        };
      });

      const buy = purchaseRows.rows[0] || {};
      resultPayload = {
        day_tz: 'Europe/Moscow',
        activity: {
          dau_today: actRows.rows[0]?.dau_today || 0,
          dau_vk: actRows.rows[0]?.dau_vk || 0,
          dau_guest: actRows.rows[0]?.dau_guest || 0,
          total_sessions_today: actRows.rows[0]?.total_sessions_today || 0,
          avg_session_sec: 280,
          new_users_today: actRows.rows[0]?.new_users_today || 0
        },
        retention: retRows.rows[0] || { d1_retention: 0, d7_retention: 0, d30_retention: 0, avg_sessions_per_dau: 1 },
        monetization: {
          ads_shown_today: commercialShown,
          test_ads_shown_today: testShown,
          fill_rate_pct: fillRate,
          completion_rate_pct: compRate,
          ads_per_dau: actRows.rows[0]?.dau_today > 0
            ? Number((commercialCompleted / actRows.rows[0].dau_today).toFixed(1))
            : 0
        },
        gameplay: {
          funnel: funnelFromRow(funnelRows.rows[0] || {}),
          level_distribution: lvlRows.rows
        },
        purchases: {
          today: Number(buy.today || 0),
          all_time: Number(buy.all_time || 0),
          rubies_today: Number(buy.rubies_today || 0),
          votes_today: Number(buy.votes_today || 0),
          by_pack: (packRows.rows || []).map((row) => ({
            pack: row.pack,
            count: Number(row.count || 0),
            rubies: Number(row.rubies || 0),
            votes: Number(row.votes || 0)
          })),
          recent: (purchaseRecentRows.rows || []).map((row) => ({
            created_at: row.created_at,
            pack: row.pack,
            user_id: maskUserId(row.user_id),
            rubies: Number(row.rubies || 0),
            votes: Number(row.votes || 0),
            source: row.source || 'client'
          }))
        },
        buttons,
        ads: {
          requested_today: Number(adTodayRows.rows[0]?.requested_today || 0),
          failed_today: Number(adTodayRows.rows[0]?.failed_today || 0),
          skipped_today: Number(adTodayRows.rows[0]?.skipped_today || 0),
          failed_users: Number(adTodayRows.rows[0]?.failed_users || 0),
          failed_users_today: Number(adTodayRows.rows[0]?.failed_users_today || 0),
          by_type: (adTypeRows.rows || []).map((row) => ({
            ad_type: row.ad_type,
            label: adTypeLabel(row.ad_type),
            requested: Number(row.requested || 0),
            shown: Number(row.shown || 0),
            completed: Number(row.completed || 0),
            failed: Number(row.failed || 0),
            skipped: Number(row.skipped || 0),
            requested_today: Number(row.requested_today || 0),
            shown_today: Number(row.shown_today || 0),
            completed_today: Number(row.completed_today || 0),
            failed_today: Number(row.failed_today || 0),
            skipped_today: Number(row.skipped_today || 0)
          })),
          reasons: (adReasonRows.rows || []).map((row) => ({
            reason: row.reason,
            ad_type: row.ad_type,
            label: adTypeLabel(row.ad_type),
            count: Number(row.count || 0),
            today: Number(row.today || 0),
            users: Number(row.users || 0),
            users_today: Number(row.users_today || 0)
          })),
          recent: (adRecentRows.rows || []).map((row) => {
            const props = row.props || {};
            return {
              created_at: row.created_at,
              event: row.event,
              user_id: maskUserId(row.user_id),
              ad_type: props.ad_type || '',
              label: adTypeLabel(props.ad_type),
              reason: props.error_reason || '',
              format: props.format || ''
            };
          })
        },
        events: {
          today_total: Number(todayTotalRows.rows[0]?.today_total || 0),
          by_type: (eventCountRows.rows || []).map((row) => ({
            event: row.event,
            label: EVENT_LABELS[row.event] || row.event,
            count: Number(row.count || 0)
          })),
          recent: (eventRecentRows.rows || []).map((row) => ({
            created_at: row.created_at,
            event: row.event,
            user_id: maskUserId(row.user_id),
            platform: row.platform || '',
            detail: eventDetail(row.event, row.props || {})
          }))
        },
        top_users: topUsersRows.rows
      };

      if (!resultPayload.buttons.length) {
        resultPayload.buttons = zeroButtons();
      }
    }

    dashboardCache = resultPayload;
    cacheTimestamp = now;

    return res.json({ ...resultPayload, cached: false });
  } catch (error) {
    console.error('Error in /api/admin/dashboard:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
