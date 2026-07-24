import { Router } from 'express';
import db from '../db.js';
import vkAuth from '../middleware/vkAuth.js';

const router = Router();

// GET /api/leaderboard - Таблица лидеров (Топ 10)
router.get('/', vkAuth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, vk_id, first_name, last_name, avatar, max_cat_level, coins
      FROM users
      ORDER BY max_cat_level DESC, coins DESC
      LIMIT 10
    `).all();

    const leaderboard = rows.map(row => ({
      id: row.id,
      vkId: row.vk_id,
      firstName: row.first_name,
      lastName: row.last_name,
      avatar: row.avatar,
      maxCatLevel: row.max_cat_level,
      coins: row.coins
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Ошибка при получении таблицы лидеров:', error);
    res.status(500).json({ error: 'Не удалось получить таблицу лидеров' });
  }
});

export default router;
