import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

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

  try {
    const vkId = String(vkUserId);
    const { coins, gems, maxCatLevel, totalCatsBought, totalMerges, gridState } = req.body || {};
    const now = Math.floor(Date.now() / 1000);

    const fields = ['last_offline_check = $1'];
    const values = [now];
    let idx = 2;

    if (coins !== undefined) { fields.push(`coins = $${idx++}`); values.push(coins); }
    if (gems !== undefined) { fields.push(`gems = $${idx++}`); values.push(gems); }
    if (maxCatLevel !== undefined) { fields.push(`max_cat_level = $${idx++}`); values.push(maxCatLevel); }
    if (totalCatsBought !== undefined) { fields.push(`total_cats_bought = $${idx++}`); values.push(totalCatsBought); }
    if (totalMerges !== undefined) { fields.push(`total_merges = $${idx++}`); values.push(totalMerges); }
    if (gridState !== undefined) {
      const gs = typeof gridState === 'string' ? gridState : JSON.stringify(gridState);
      fields.push(`grid_state = $${idx++}`);
      values.push(gs);
    }

    values.push(vkId);

    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE vk_id = $${idx}`,
      values
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Save Error:', error);
    return res.status(200).json({ success: true });
  }
}
