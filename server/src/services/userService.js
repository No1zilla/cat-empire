import { randomUUID } from 'crypto';
import pool from '../db.js';
import { shouldRestoreProgressFloor } from '../utils/progressFloor.js';

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

function formatUser(row) {
  if (!row) return null;
  let parsedGridState = row.grid_state;
  if (typeof parsedGridState === 'string') {
    try {
      parsedGridState = JSON.parse(parsedGridState);
    } catch {
      parsedGridState = null;
    }
  }
  return {
    id: row.id,
    vkId: row.vk_id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatar: row.avatar,
    coins: parseFloat(row.coins),
    gems: row.gems,
    maxCatLevel: row.max_cat_level,
    totalCatsBought: row.total_cats_bought || 0,
    totalCatsCreated: row.total_cats_created || row.total_cats_bought || 0,
    totalMerges: row.total_merges || 0,
    gridState: parsedGridState,
    lastOfflineCheck: new Date(Number(row.last_offline_check) * 1000).toISOString()
  };
}

export class UserService {
  async getOrCreateUser(vkUserId, { skipFloor = false } = {}) {
    const vkId = String(vkUserId);
    const now  = Math.floor(Date.now() / 1000);

    // Ищем пользователя
    let { rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]);

    if (rows.length === 0) {
      // Создаём нового
      const initialGrid = JSON.stringify([
        { slotIndex: 0, catLevel: 1 },
        { slotIndex: 1, catLevel: 1 }
      ]);
      const id = randomUUID();
      await pool.query(`
        INSERT INTO users (id, vk_id, first_name, coins, gems, max_cat_level, total_cats_bought, total_cats_created, total_merges, grid_state, last_offline_check, created_at)
        VALUES ($1, $2, 'Игрок', 100, 10, 1, 0, 0, 0, $3, $4, $4)
      `, [id, vkId, initialGrid, now]);

      ({ rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]));
    } else {
      // Считаем оффлайн-доход
      const user   = rows[0];
      const diff   = Math.max(0, now - Number(user.last_offline_check));
      const capped = Math.min(diff, 28800); // макс 8 часов
      const income = capped * calculateIncomePerSecond(user.grid_state);

      if (income > 0) {
        await pool.query(
          'UPDATE users SET coins = coins + $1, last_offline_check = $2 WHERE vk_id = $3',
          [income, now, vkId]
        );
        ({ rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]));
      }
    }

    return this._restoreProgressFloor(vkId, formatUser(rows[0]), { skipFloor });
  }

  async _restoreProgressFloor(vkId, user, { skipFloor = false } = {}) {
    if (!user || !pool || skipFloor) return user;
    if (!shouldRestoreProgressFloor(user)) return user;
    const current = Number(user.maxCatLevel) || 1;
    try {
      const { rows } = await pool.query(
        `
        SELECT GREATEST(
          COALESCE((SELECT MAX((props->>'level')::int) FROM analytics_events
                    WHERE event = 'max_cat_level_reached' AND user_id = $1), 0),
          COALESCE((SELECT MAX((props->>'level_to')::int) FROM analytics_events
                    WHERE event = 'merge_manual' AND user_id = $1), 0)
        ) AS peak
        `,
        [String(vkId)]
      );
      const peak = Number(rows[0] && rows[0].peak) || 0;
      if (peak > current) {
        await pool.query(
          'UPDATE users SET max_cat_level = $1 WHERE vk_id = $2 AND max_cat_level < $1',
          [peak, String(vkId)]
        );
        const again = await pool.query('SELECT * FROM users WHERE vk_id = $1', [String(vkId)]);
        return formatUser(again.rows[0]) || user;
      }
    } catch (e) {
      console.warn('restoreProgressFloor skipped:', e && e.message);
    }
    return user;
  }

  async saveUserProgress(vkUserId, {
    coins,
    gems,
    maxCatLevel,
    totalCatsBought,
    totalCatsCreated,
    totalMerges,
    gridState,
    firstName,
    lastName,
    avatar,
    isReset
  }) {
    const vkId = String(vkUserId);
    const now  = Math.floor(Date.now() / 1000);
    const existing = await this.getOrCreateUser(vkId, { skipFloor: Boolean(isReset) });
    const storedLvl = Number(existing && existing.maxCatLevel) || 1;
    if (!isReset && maxCatLevel !== undefined && (Number(maxCatLevel) || 1) < storedLvl) {
      if (firstName === undefined && lastName === undefined && avatar === undefined) {
        return existing;
      }
      maxCatLevel = undefined;
      coins = undefined;
      gems = undefined;
      totalCatsBought = undefined;
      totalCatsCreated = undefined;
      totalMerges = undefined;
      gridState = undefined;
    }

    const fields = ['last_offline_check = $1'];
    const values = [now];
    let   idx    = 2;

    if (coins            !== undefined) { fields.push(`coins = $${idx++}`);              values.push(coins); }
    if (gems             !== undefined) { fields.push(`gems = $${idx++}`);               values.push(gems); }
    if (maxCatLevel      !== undefined) { fields.push(`max_cat_level = $${idx++}`);      values.push(maxCatLevel); }
    if (totalCatsBought  !== undefined) { fields.push(`total_cats_bought = $${idx++}`);  values.push(totalCatsBought); }
    if (totalCatsCreated !== undefined) { fields.push(`total_cats_created = $${idx++}`); values.push(totalCatsCreated); }
    if (totalMerges      !== undefined) { fields.push(`total_merges = $${idx++}`);       values.push(totalMerges); }
    if (gridState        !== undefined) {
      const gs = typeof gridState === 'string' ? gridState : JSON.stringify(gridState);
      fields.push(`grid_state = $${idx++}`);
      values.push(gs);
    }
    if (firstName !== undefined && String(firstName).trim()) {
      fields.push(`first_name = $${idx++}`);
      values.push(String(firstName).trim().slice(0, 64));
    }
    if (lastName !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(String(lastName || '').trim().slice(0, 64));
    }
    if (avatar !== undefined) {
      fields.push(`avatar = $${idx++}`);
      values.push(String(avatar || '').slice(0, 512));
    }

    values.push(vkId);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE vk_id = $${idx}`,
      values
    );

    const { rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]);
    return formatUser(rows[0]);
  }

  async addGems(vkUserId, amount) {
    const vkId = String(vkUserId);
    const gems = Math.max(0, Number(amount) || 0);
    if (!vkId || gems <= 0) return null;
    await this.getOrCreateUser(vkId);
    await pool.query('UPDATE users SET gems = gems + $1 WHERE vk_id = $2', [gems, vkId]);
    const { rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]);
    return formatUser(rows[0]);
  }
}

export default new UserService();
