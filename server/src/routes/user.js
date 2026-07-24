import { Router } from 'express';
import vkAuth from '../middleware/vkAuth.js';
import userService from '../services/userService.js';

const router = Router();

// GET /api/user/profile - Получение или авто-создание профиля
router.get('/profile', vkAuth, async (req, res) => {
  try {
    const user = await userService.getOrCreateUser(req.vkUserId);
    res.json({ user });
  } catch (error) {
    console.error('Ошибка в GET /api/user/profile:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/user/save - Сохранение прогресса игрока
router.post('/save', vkAuth, async (req, res) => {
  try {
    const { coins, gems, maxCatLevel, gridState } = req.body || {};
    const user = await userService.saveUserProgress(req.vkUserId, {
      coins,
      gems,
      maxCatLevel,
      gridState
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Ошибка в POST /api/user/save:', error);
    res.status(400).json({ error: error.message || 'Ошибка сохранения прогресса' });
  }
});

export default router;
