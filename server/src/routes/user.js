import { Router } from 'express';
import playerAuth, { requirePlayer } from '../middleware/playerAuth.js';
import { playerKey } from '../utils/playerKey.js';
import userService from '../services/userService.js';

const router = Router();

// GET /api/user/profile - Получение или авто-создание профиля
router.get('/profile', playerAuth, requirePlayer, async (req, res) => {
  try {
    const user = await userService.getOrCreateUser(playerKey(req.player));
    res.json({ user });
  } catch (error) {
    console.error('Ошибка в GET /api/user/profile:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/user/save - Сохранение прогресса игрока
router.post('/save', playerAuth, requirePlayer, async (req, res) => {
  try {
    const body = req.body || {};
    const user = await userService.saveUserProgress(playerKey(req.player), {
      coins: body.coins,
      gems: body.gems,
      maxCatLevel: body.maxCatLevel ?? body.max_cat_level,
      totalCatsBought: body.totalCatsBought ?? body.total_cats_bought,
      totalMerges: body.totalMerges ?? body.total_merges,
      gridState: body.gridState ?? body.grid_state,
      firstName: body.firstName ?? body.first_name,
      lastName: body.lastName ?? body.last_name,
      avatar: body.avatar,
      isReset: body.isReset || body.is_reset || false
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Ошибка в POST /api/user/save:', error);
    res.status(400).json({ error: error.message || 'Ошибка сохранения прогресса' });
  }
});

export default router;
