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
      total_cats_bought INTEGER DEFAULT 0,
      total_cats_created INTEGER DEFAULT 0,
      total_merges      INTEGER DEFAULT 0,
      grid_state        TEXT DEFAULT '[]',
      last_offline_check BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
      created_at        BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
    )
  `);

  // Авто-миграция для существующих БД
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cats_bought INTEGER DEFAULT 0;');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cats_created INTEGER DEFAULT 0;');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS total_merges INTEGER DEFAULT 0;');
  } catch (e) {
    // игнорируем если колонка уже существует
  }

  // Таблица аналитических событий (TASK-066)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id         BIGSERIAL PRIMARY KEY,
      event      VARCHAR(64) NOT NULL,
      user_id    VARCHAR(64),
      session_id VARCHAR(64),
      platform   VARCHAR(16),
      props      JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event);
    CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
  `);

  console.log('✅ PostgreSQL подключён, таблицы users и analytics_events готовы');
}

// Пробуем подключиться с повторами (PostgreSQL может стартовать позже)
async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await initDB();
      return;
    } catch (err) {
      console.error(`❌ Ошибка подключения к БД (попытка ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('❌ Не удалось подключиться к PostgreSQL после всех попыток');
}

connectWithRetry();

export default pool;
