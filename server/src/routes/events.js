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
