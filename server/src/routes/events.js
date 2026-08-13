import express from 'express';
import pool from '../db.js';

const router = express.Router();

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

    if (pool && process.env.DATABASE_URL) {
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const ev of events) {
            const {
              event,
              user_id = 'guest',
              session_id = '',
              platform = 'vk',
              timestamp = Date.now(),
              props = {}
            } = ev;

            const eventProps = { ...props, timestamp };

            await client.query(
              `INSERT INTO analytics_events (event, user_id, session_id, platform, props)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                String(event || 'unknown'),
                String(user_id),
                String(session_id),
                String(platform),
                JSON.stringify(eventProps)
              ]
            );

            // TASK-067: Авто-расчет retention метрик при старте сессии
            if (event === 'session_start' && user_id && user_id !== 'guest') {
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
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('❌ Ошибка транзакции analytics_events:', err.message);
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL недоступен, событие обработано автономно:', dbErr.message);
      }
    }

    return res.json({ success: true, count: events.length });
  } catch (error) {
    console.error('❌ Ошибка записи событий в analytics_events:', error.message);
    return res.status(500).json({ error: 'Ошибка сервера при записи аналитики' });
  }
});

export default router;
