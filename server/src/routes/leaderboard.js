import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import vkAuth from '../middleware/vkAuth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/leaderboard - Таблица лидеров (Топ 10)
router.get('/', vkAuth, async (req, res) => {
  try {
    const topUsers = await prisma.user.findMany({
      take: 10,
      orderBy: [
        { maxCatLevel: 'desc' },
        { coins: 'desc' }
      ],
      select: {
        id: true,
        vkId: true,
        firstName: true,
        lastName: true,
        avatar: true,
        maxCatLevel: true,
        coins: true
      }
    });

    const formattedLeaderboard = topUsers.map((user) => ({
      ...user,
      vkId: user.vkId.toString()
    }));

    res.json({ leaderboard: formattedLeaderboard });
  } catch (error) {
    console.error('Ошибка при получении таблицы лидеров:', error);
    res.status(500).json({ error: 'Не удалось получить таблицу лидеров' });
  }
});

export default router;
