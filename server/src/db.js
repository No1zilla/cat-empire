import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../../data');
const DB_FILE   = join(DATA_DIR, 'users.json');

// Создаём папку data если её нет
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// Загружаем БД из файла (или пустой объект)
function load() {
  if (!existsSync(DB_FILE)) return {};
  try { return JSON.parse(readFileSync(DB_FILE, 'utf8')); }
  catch { return {}; }
}

// Сохраняем БД в файл
function save(data) {
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export { load, save };
