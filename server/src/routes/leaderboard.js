import { Router } from 'express';
import pool from '../db.js';
import playerAuth from '../middleware/playerAuth.js';
import playerKey from '../utils/playerKey.js';
import { buildLeaderboardPayload } from '../utils/leaderboardPayload.js';

const router = Router();

router.get('/', playerAuth, async (req, res) => {
  try {
    if (!pool || !process.env.DATABASE_URL) {
      return res.json({ leaderboard: [], me: null });
    }

    const meKey = playerKey(req.player || {});
    const { rows } = await pool.query(
      `
      WITH ranked AS (
        SELECT
          id, vk_id, first_name, last_name, avatar, max_cat_level, coins,
          ROW_NUMBER() OVER (
            ORDER BY max_cat_level DESC, coins DESC, vk_id ASC
          )::int AS rank
        FROM users
        WHERE vk_id IS NOT NULL
          AND vk_id <> ''
          AND vk_id NOT IN ('0', '999999999')
      )
      SELECT * FROM ranked
      WHERE rank <= 10 OR vk_id = $1
      ORDER BY rank
      LIMIT 11
      `,
      [meKey]
    );

    res.json(buildLeaderboardPayload(rows, meKey));
  } catch (error) {
    console.error('Ошибка при получении таблицы лидеров:', error);
    res.status(500).json({ error: 'Не удалось получить таблицу лидеров' });
  }
});

export default router;
