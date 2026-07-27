import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

let tableInitialized = false;

async function ensureTable() {
  if (tableInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                TEXT PRIMARY KEY,
        vk_id             TEXT UNIQUE NOT NULL,
        first_name        TEXT DEFAULT '',
        last_name         TEXT DEFAULT '',
        avatar            TEXT DEFAULT '',
        coins             FLOAT DEFAULT 100,
        gems              INTEGER DEFAULT 10,
        max_cat_level     INTEGER DEFAULT 1,
        total_cats_bought INTEGER DEFAULT 0,
        total_cats_created INTEGER DEFAULT 0,
        total_merges      INTEGER DEFAULT 0,
        grid_state        TEXT DEFAULT '[]',
        last_offline_check BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        created_at        BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      )
    `);
    tableInitialized = true;
  } catch (e) {
    console.warn('Table init warning:', e);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vk-sign');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const vkSignHeader = req.headers['x-vk-sign'] || req.headers['authorization'] || '';
  const queryString = vkSignHeader || (req.url ? req.url.split('?')[1] : '') || '';

  let vkUserId = '999999999';
  if (queryString) {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
    const rawId = params.get('vk_user_id');
    if (rawId) vkUserId = rawId;
  }

  await ensureTable();

  try {
    const vkId = String(vkUserId);
    let { rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]);

    if (rows.length === 0) {
      const initialGrid = JSON.stringify([
        { slotIndex: 0, catLevel: 1 },
        { slotIndex: 1, catLevel: 1 }
      ]);
      const id = String(Date.now());
      const now = Math.floor(Date.now() / 1000);
      await pool.query(`
        INSERT INTO users (id, vk_id, first_name, coins, gems, max_cat_level, total_cats_bought, total_merges, grid_state, last_offline_check, created_at)
        VALUES ($1, $2, 'Игрок', 100, 10, 1, 0, 0, $3, $4, $4)
      `, [id, vkId, initialGrid, now]);

      ({ rows } = await pool.query('SELECT * FROM users WHERE vk_id = $1', [vkId]));
    }

    const row = rows[0];
    let parsedGrid = row.grid_state;
    if (typeof parsedGrid === 'string') {
      try { parsedGrid = JSON.parse(parsedGrid); } catch { parsedGrid = null; }
    }

    return res.status(200).json({
      user: {
        id: row.id,
        vkId: row.vk_id,
        coins: parseFloat(row.coins),
        gems: row.gems,
        maxCatLevel: row.max_cat_level,
        totalCatsBought: row.total_cats_bought || 0,
        totalMerges: row.total_merges || 0,
        gridState: parsedGrid
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(200).json({
      user: {
        coins: 100,
        gems: 10,
        maxCatLevel: 1,
        gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
      }
    });
  }
}
