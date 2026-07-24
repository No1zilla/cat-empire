import { randomUUID } from 'crypto';
import { load, save } from '../db.js';

function calculateIncomePerSecond(gridStateStr) {
  try {
    const grid = typeof gridStateStr === 'string' ? JSON.parse(gridStateStr) : gridStateStr;
    if (!Array.isArray(grid)) return 0;
    return grid.reduce((total, cell) => {
      const level = Number(cell.catLevel) || 1;
      return total + Math.pow(2, level - 1);
    }, 0);
  } catch { return 0; }
}

export class UserService {
  getOrCreateUser(vkUserId) {
    const vkId = String(vkUserId);
    const db   = load();
    const now  = Math.floor(Date.now() / 1000);

    if (!db[vkId]) {
      db[vkId] = {
        id: randomUUID(),
        vkId,
        firstName: 'Игрок',
        lastName: '',
        avatar: '',
        coins: 100,
        gems: 10,
        maxCatLevel: 1,
        gridState: JSON.stringify([
          { slotIndex: 0, catLevel: 1 },
          { slotIndex: 1, catLevel: 1 }
        ]),
        lastOfflineCheck: now,
        createdAt: now
      };
      save(db);
    } else {
      const user   = db[vkId];
      const diff   = Math.max(0, now - user.lastOfflineCheck);
      const capped = Math.min(diff, 28800);
      const income = capped * calculateIncomePerSecond(user.gridState);
      if (income > 0) {
        user.coins += income;
        user.lastOfflineCheck = now;
        save(db);
      }
    }

    return db[vkId];
  }

  saveUserProgress(vkUserId, { coins, gems, maxCatLevel, gridState }) {
    const vkId = String(vkUserId);
    const db   = load();
    const now  = Math.floor(Date.now() / 1000);

    if (!db[vkId]) throw new Error('Пользователь не найден');

    const user = db[vkId];
    if (coins       !== undefined) user.coins        = coins;
    if (gems        !== undefined) user.gems         = gems;
    if (maxCatLevel !== undefined) user.maxCatLevel  = maxCatLevel;
    if (gridState   !== undefined) {
      user.gridState = typeof gridState === 'string'
        ? gridState
        : JSON.stringify(gridState);
    }
    user.lastOfflineCheck = now;
    save(db);

    return user;
  }
}

export default new UserService();
