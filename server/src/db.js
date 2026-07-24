import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/game.db');

// Инициализация БД
const db = new Database(DB_PATH);

// Создание таблицы если не существует
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    vk_id       TEXT UNIQUE NOT NULL,
    first_name  TEXT DEFAULT '',
    last_name   TEXT DEFAULT '',
    avatar      TEXT DEFAULT '',
    coins       REAL DEFAULT 100,
    gems        INTEGER DEFAULT 10,
    max_cat_level INTEGER DEFAULT 1,
    grid_state  TEXT DEFAULT '[]',
    last_offline_check INTEGER DEFAULT (strftime('%s', 'now')),
    created_at  INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

export default db;
