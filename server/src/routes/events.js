import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Миграция event_id в db.js best-effort: если она не прошла, ON CONFLICT свалит
// транзакцию и мы потеряем всю аналитику. Проверяем один раз ДО BEGIN — упавший
// statement отравляет транзакцию целиком, ловить его внутри цикла нельзя.
let dedupeSupported = null;

const INSERT_DEDUPED = `
  INSERT INTO analytics_events (event, event_id, user_id, session_id, platform, props)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING
  RETURNING id
`;

const INSERT_PLAIN = `
  INSERT INTO analytics_events (event, user_id, session_id, platform, props)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id
`;

async function canDedupe(client) {
  if (dedupeSupported !== null) return dedupeSupported;
  try {
    const { rows } = await client.query(
      `SELECT 1 FROM pg_indexes
       WHERE tablename = 'analytics_events' AND indexname = 'idx_analytics_event_id'`
    );
    dedupeSupported = rows.length > 0;
    if (!dedupeSupported) {
      console.warn('⚠️ Индекса idx_analytics_event_id нет — пишем события без дедупликации');
    }
  } catch (e) {
    dedupeSupported = false;
    console.warn('⚠️ Проверка дедупликации не удалась, пишем как раньше:', e.message);
  }
  return dedupeSupported;
}

/**
 * POST /api/events/batch
 * Принимает батч аналитических событий и сохраняет в таблицу analytics_events
 */
router.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Массив events обязателен и не должен быть пустым' });
    }

    let duplicates = 0;

    if (pool && process.env.DATABASE_URL) {
      let committed = false;
      try {
        const client = await pool.connect();
        try {
          const dedupe = await canDedupe(client);
          await client.query('BEGIN');

          for (const ev of events) {
            const {
              event,
              event_id = null,
              user_id = 'guest',
              session_id = '',
              platform = 'vk',
              timestamp = Date.now(),
              props = {}
            } = ev;

            const eventProps = { ...props, timestamp };

            const name = String(event || 'unknown');
            const uid = String(user_id);
            const sid = String(session_id);
            const plat = String(platform);
            const payload = JSON.stringify(eventProps);

            // ON CONFLICT гасит повторную доставку того же события.
            // Пустой RETURNING = дубль, значит и счётчики сессий трогать нельзя.
            const inserted = dedupe
              ? await client.query(INSERT_DEDUPED, [
                  name,
                  event_id ? String(event_id).slice(0, 64) : null,
                  uid,
                  sid,
                  plat,
                  payload
                ])
              : await client.query(INSERT_PLAIN, [name, uid, sid, plat, payload]);

            if (inserted.rowCount === 0) {
              duplicates += 1;
              continue;
            }

            // TASK-067: Авто-расчет retention метрик при старте сессии
            if (event === 'session_start' && user_id) {
              const uId = String(user_id);
              const { rows: sessionRows } = await client.query('SELECT * FROM user_sessions WHERE user_id = $1', [uId]);
              if (sessionRows.length === 0) {
                await client.query(
                  `INSERT INTO user_sessions (user_id, first_seen_at, last_seen_at, session_count)
                   VALUES ($1, NOW(), NOW(), 1)`,
                  [uId]
                );
              } else {
                const s = sessionRows[0];
                const daysDiff = (Date.now() - new Date(s.first_seen_at).getTime()) / (1000 * 60 * 60 * 24);
                const d1 = s.d1_returned || daysDiff >= 1;
                const d7 = s.d7_returned || daysDiff >= 7;
                const d30 = s.d30_returned || daysDiff >= 30;

                await client.query(
                  `UPDATE user_sessions
                   SET last_seen_at = NOW(),
                       session_count = session_count + 1,
                       d1_returned = $1,
                       d7_returned = $2,
                       d30_returned = $3
                   WHERE user_id = $4`,
                  [d1, d7, d30, uId]
                );
              }
            }
          }

          await client.query('COMMIT');
          committed = true;
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('❌ Ошибка транзакции analytics_events:', err.message);
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL недоступен, события не записаны:', dbErr.message);
      }
      if (!committed) {
        return res.status(500).json({ error: 'Не записали события' });
      }
    }

    return res.json({
      success: true,
      count: events.length - duplicates,
      duplicates
    });
  } catch (error) {
    console.error('❌ Ошибка записи событий в analytics_events:', error.message);
    return res.status(500).json({ error: 'Ошибка сервера при записи аналитики' });
  }
});

export default router;
