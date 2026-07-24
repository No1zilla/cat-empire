import { randomUUID } from 'crypto';
import pool from '../db.js';

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
  return {
    id: row.id,
    vkId: row.vk_id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatar: row.avatar,
    coins: parseFloat(row.coins),
    gems: row.gems,
    maxCatLevel: row.max_cat_level,
    gridState: row.grid_state,
    lastOfflineCheck: new Date(Number(row.last_offline_check) * 1000).toISOString()
  };
}

export class UserService {
  async getOrCreateUser(vkUserId) {
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
        INSERT INTO users (id, vk_id, first_name, coins, gems, max_cat_level, grid_state, last_offline_check, created_at)
        VALUES ($1, $2, 'Игрок', 100, 10, 1, $3, $4, $4)
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

    return formatUser(rows[0]);
  }

  async saveUserProgress(vkUserId, { coins, gems, maxCatLevel, gridState }) {
    const vkId = String(vkUserId);
    const now  = Math.floor(Date.now() / 1000);

    const fields = ['last_offline_check = $1'];
    const values = [now];
    let   idx    = 2;

    if (coins       !== undefined) { fields.push(`coins = $${idx++}`);         values.push(coins); }
    if (gems        !== undefined) { fields.push(`gems = $${idx++}`);          values.push(gems); }
    if (maxCatLevel !== undefined) { fields.push(`max_cat_level = $${idx++}`); values.push(maxCatLevel); }
    if (gridState   !== undefined) {
      const gs = typeof gridState === 'string' ? gridState : JSON.stringify(gridState);
      fields.push(`grid_state = $${idx++}`);
      values.push(gs);
    }

    values.push(vkId);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE vk_id = $${idx}`,
      values
    );

    const { rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]);
    return formatUser(rows[0]);
  }
}

export default new UserService();
