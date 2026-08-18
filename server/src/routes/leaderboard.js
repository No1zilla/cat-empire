import { Router } from 'express';
import pool from '../db.js';
import vkAuth from '../middleware/vkAuth.js';

const router = Router();

function mapRow(r) {
  return {
    id: r.id,
    vkId: String(r.vk_id),
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    avatar: r.avatar || '',
    maxCatLevel: Number(r.max_cat_level) || 1,
    coins: parseFloat(r.coins) || 0,
    rank: Number(r.rank) || 0
  };
}

router.get('/', vkAuth, async (req, res) => {
  try {
    if (!pool || !process.env.DATABASE_URL) {
      return res.json({ leaderboard: [], me: null });
    }

    const meId = String(req.vkUserId || '');
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
          AND vk_id NOT IN ('0', '999999999')
      )
      SELECT * FROM ranked
      WHERE rank <= 10 OR vk_id = $1
      ORDER BY rank
      LIMIT 11
      `,
      [meId]
    );

    const mapped = rows.map(mapRow);
    const leaderboard = mapped.filter((row) => row.rank > 0 && row.rank <= 10);
    const me = mapped.find((row) => row.vkId === meId) || null;

    res.json({ leaderboard, me });
  } catch (error) {
    console.error('Ошибка при получении таблицы лидеров:', error);
    res.status(500).json({ error: 'Не удалось получить таблицу лидеров' });
  }
});

export default router;
