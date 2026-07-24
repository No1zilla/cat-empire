import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Railway автоматически задаёт DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

// Создание таблицы при первом запуске
async function initDB() {
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
      grid_state        TEXT DEFAULT '[]',
      last_offline_check BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
      created_at        BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
    )
  `);
  console.log('✅ PostgreSQL подключён, таблица users готова');
}

initDB().catch(err => {
  console.error('❌ Ошибка подключения к БД:', err.message);
  process.exit(1);
});

export default pool;
