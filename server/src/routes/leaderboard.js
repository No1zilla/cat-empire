import { Router } from 'express';
import { load } from '../db.js';
import vkAuth from '../middleware/vkAuth.js';

const router = Router();

router.get('/', vkAuth, (req, res) => {
  try {
    const db = load();
    const leaderboard = Object.values(db)
      .sort((a, b) => b.maxCatLevel - a.maxCatLevel || b.coins - a.coins)
      .slice(0, 10)
      .map(({ id, vkId, firstName, lastName, avatar, maxCatLevel, coins }) =>
        ({ id, vkId, firstName, lastName, avatar, maxCatLevel, coins }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Ошибка при получении таблицы лидеров:', error);
    res.status(500).json({ error: 'Не удалось получить таблицу лидеров' });
  }
});

export default router;
