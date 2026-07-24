import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Преобразование пользователя для ответа JSON (BigInt vkId -> String)
 */
function formatUser(user) {
  if (!user) return null;
  return {
    ...user,
    vkId: user.vkId.toString()
  };
}

/**
 * Расчет пассивного дохода котиков в секунду
 */
function calculateIncomePerSecond(gridStateStr) {
  try {
    const grid = typeof gridStateStr === 'string' ? JSON.parse(gridStateStr) : gridStateStr;
    if (!Array.isArray(grid)) return 0;
    
    // Каждая ячейка с котиком даёт доход = 2^(level - 1) монет/сек (или level монет/сек)
    return grid.reduce((total, cell) => {
      const level = Number(cell.catLevel) || 1;
      return total + Math.pow(2, level - 1);
    }, 0);
  } catch (e) {
    return 0;
  }
}

export class UserService {
  /**
   * Получение или авто-создание профиля пользователя с расчётом оффлайн-дохода
   */
  async getOrCreateUser(vkUserId) {
    const vkId = BigInt(vkUserId);

    let user = await prisma.user.findUnique({
      where: { vkId }
    });

    const now = new Date();

    if (!user) {
      // Начальная сетка: 2 котика 1-го уровня
      const initialGrid = [
        { slotIndex: 0, catLevel: 1 },
        { slotIndex: 1, catLevel: 1 }
      ];

      user = await prisma.user.create({
        data: {
          vkId,
          firstName: 'Игрок',
          lastName: '',
          avatar: '',
          coins: 100,
          gems: 10,
          maxCatLevel: 1,
          gridState: JSON.stringify(initialGrid),
          lastOfflineCheck: now
        }
      });
    } else {
      // Расчет оффлайн-дохода с момента lastOfflineCheck
      const lastCheck = new Date(user.lastOfflineCheck);
      const diffInSeconds = Math.max(0, Math.floor((now.getTime() - lastCheck.getTime()) / 1000));

      if (diffInSeconds > 0) {
        // Ограничение максимум 8 часов (28800 сек) оффлайн-дохода
        const cappedSeconds = Math.min(diffInSeconds, 28800);
        const incomePerSec = calculateIncomePerSecond(user.gridState);
        const offlineEarnings = cappedSeconds * incomePerSec;

        if (offlineEarnings > 0 || cappedSeconds > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              coins: user.coins + offlineEarnings,
              lastOfflineCheck: now
            }
          });
        }
      }
    }

    return formatUser(user);
  }

  /**
   * Сохранение прогресса игрока
   */
  async saveUserProgress(vkUserId, { coins, gems, maxCatLevel, gridState }) {
    const vkId = BigInt(vkUserId);

    // Валидация входных данных
    if (coins !== undefined && (typeof coins !== 'number' || coins < 0)) {
      throw new Error('Некорректное значение coins');
    }
    if (gems !== undefined && (typeof gems !== 'number' || gems < 0)) {
      throw new Error('Некорректное значение gems');
    }
    if (maxCatLevel !== undefined && (typeof maxCatLevel !== 'number' || maxCatLevel < 1)) {
      throw new Error('Некорректное значение maxCatLevel');
    }

    let gridStateString = undefined;
    if (gridState !== undefined) {
      if (typeof gridState === 'string') {
        // Проверка на валидность JSON
        JSON.parse(gridState);
        gridStateString = gridState;
      } else if (Array.isArray(gridState) || typeof gridState === 'object') {
        gridStateString = JSON.stringify(gridState);
      }
    }

    const updateData = {
      lastOfflineCheck: new Date()
    };

    if (coins !== undefined) updateData.coins = coins;
    if (gems !== undefined) updateData.gems = gems;
    if (maxCatLevel !== undefined) updateData.maxCatLevel = maxCatLevel;
    if (gridStateString !== undefined) updateData.gridState = gridStateString;

    const user = await prisma.user.update({
      where: { vkId },
      data: updateData
    });

    return formatUser(user);
  }
}

export default new UserService();
