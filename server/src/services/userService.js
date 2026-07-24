import db from '../db.js';
import { randomUUID } from 'crypto';

/**
 * Расчет пассивного дохода котиков в секунду
 */
function calculateIncomePerSecond(gridStateStr) {
  try {
    const grid = typeof gridStateStr === 'string' ? JSON.parse(gridStateStr) : gridStateStr;
    if (!Array.isArray(grid)) return 0;
    return grid.reduce((total, cell) => {
      const level = Number(cell.catLevel) || 1;
      return total + Math.pow(2, level - 1);
    }, 0);
  } catch {
    return 0;
  }
}

function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    vkId: row.vk_id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatar: row.avatar,
    coins: row.coins,
    gems: row.gems,
    maxCatLevel: row.max_cat_level,
    gridState: row.grid_state,
    lastOfflineCheck: new Date(row.last_offline_check * 1000).toISOString()
  };
}

export class UserService {
  /**
   * Получение или авто-создание профиля пользователя
   */
  getOrCreateUser(vkUserId) {
    const vkId = String(vkUserId);
    const now = Math.floor(Date.now() / 1000);

    let user = db.prepare('SELECT * FROM users WHERE vk_id = ?').get(vkId);

    if (!user) {
      const initialGrid = JSON.stringify([
        { slotIndex: 0, catLevel: 1 },
        { slotIndex: 1, catLevel: 1 }
      ]);

      const id = randomUUID();
      db.prepare(`
        INSERT INTO users (id, vk_id, first_name, last_name, avatar, coins, gems, max_cat_level, grid_state, last_offline_check)
        VALUES (?, ?, 'Игрок', '', '', 100, 10, 1, ?, ?)
      `).run(id, vkId, initialGrid, now);

      user = db.prepare('SELECT * FROM users WHERE vk_id = ?').get(vkId);
    } else {
      // Расчет оффлайн-дохода
      const diffInSeconds = Math.max(0, now - user.last_offline_check);
      if (diffInSeconds > 0) {
        const cappedSeconds = Math.min(diffInSeconds, 28800); // макс 8 часов
        const incomePerSec = calculateIncomePerSecond(user.grid_state);
        const offlineEarnings = cappedSeconds * incomePerSec;

        if (offlineEarnings > 0) {
          db.prepare('UPDATE users SET coins = coins + ?, last_offline_check = ? WHERE vk_id = ?')
            .run(offlineEarnings, now, vkId);
          user = db.prepare('SELECT * FROM users WHERE vk_id = ?').get(vkId);
        }
      }
    }

    return formatUser(user);
  }

  /**
   * Сохранение прогресса игрока
   */
  saveUserProgress(vkUserId, { coins, gems, maxCatLevel, gridState }) {
    const vkId = String(vkUserId);
    const now = Math.floor(Date.now() / 1000);

    if (coins !== undefined && (typeof coins !== 'number' || coins < 0))
      throw new Error('Некорректное значение coins');
    if (gems !== undefined && (typeof gems !== 'number' || gems < 0))
      throw new Error('Некорректное значение gems');
    if (maxCatLevel !== undefined && (typeof maxCatLevel !== 'number' || maxCatLevel < 1))
      throw new Error('Некорректное значение maxCatLevel');

    let gridStateString = undefined;
    if (gridState !== undefined) {
      if (typeof gridState === 'string') {
        JSON.parse(gridState); // валидация JSON
        gridStateString = gridState;
      } else {
        gridStateString = JSON.stringify(gridState);
      }
    }

    // Динамически собираем SET-часть запроса
    const fields = ['last_offline_check = ?'];
    const values = [now];

    if (coins !== undefined)        { fields.push('coins = ?');         values.push(coins); }
    if (gems !== undefined)         { fields.push('gems = ?');          values.push(gems); }
    if (maxCatLevel !== undefined)  { fields.push('max_cat_level = ?'); values.push(maxCatLevel); }
    if (gridStateString !== undefined) { fields.push('grid_state = ?'); values.push(gridStateString); }

    values.push(vkId);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE vk_id = ?`).run(...values);

    const user = db.prepare('SELECT * FROM users WHERE vk_id = ?').get(vkId);
    return formatUser(user);
  }
}

export default new UserService();
