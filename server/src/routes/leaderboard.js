import { Router } from 'express';
import pool from '../db.js';
import vkAuth from '../middleware/vkAuth.js';

const router = Router();

router.get('/', vkAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, vk_id, first_name, last_name, avatar, max_cat_level, coins
      FROM users
      ORDER BY max_cat_level DESC, coins DESC
      LIMIT 10
    `);

    const leaderboard = rows.map(r => ({
      id: r.id,
      vkId: r.vk_id,
      firstName: r.first_name,
      lastName: r.last_name,
      avatar: r.avatar,
      maxCatLevel: r.max_cat_level,
      coins: parseFloat(r.coins)
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Ошибка при получении таблицы лидеров:', error);
    res.status(500).json({ error: 'Не удалось получить таблицу лидеров' });
  }
});

export default router;
