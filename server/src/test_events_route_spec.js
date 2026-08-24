// server/src/test_events_route_spec.js
// Специализированный юнит-тест для эндпоинта POST /api/events/batch (TASK-066)

import assert from 'assert';
import eventsRouter from './routes/events.js';
import pool from './db.js';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ TASK-066: Backend POST /api/events/batch');
console.log('🧪 =========================================================\n');

// Проверка 1: Валидация входного тела запроса (400 при пустом массиве)
console.log('📌 ТЕСТ 1: Отклонение пустого тела запроса (400 Bad Request)');

const mockReqEmpty = { body: {} };
let statusCode = 200;
let jsonRes = null;

const mockRes = {
  status(code) {
    statusCode = code;
    return this;
  },
  json(data) {
    jsonRes = data;
    return this;
  }
};

// Запускаем роут напрямую через функции Express
const layer = eventsRouter.stack.find(s => s.route && s.route.path === '/batch');
assert.ok(layer, 'Роут /batch должен быть объявлен в eventsRouter');

await layer.route.stack[0].handle(mockReqEmpty, mockRes, () => {});

assert.strictEqual(statusCode, 400);
assert.ok(jsonRes.error);
console.log('  [Pass] Пустой батч правильно отклоняется с кодом 400');
console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

// Проверка 2: Валидация корректной обработки массива событий
console.log('📌 ТЕСТ 2: Корректный ответ на валидный батч событий');

const mockReqValid = {
  body: {
    events: [
      { event: 'session_start', user_id: 'test_1', platform: 'vk', timestamp: Date.now(), props: { test: true } },
      { event: 'cat_bought', user_id: 'test_1', platform: 'vk', timestamp: Date.now(), props: { cost: 10 } }
    ]
  }
};

statusCode = 200;
jsonRes = null;

const dbUrlForTest2 = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;
await layer.route.stack[0].handle(mockReqValid, mockRes, () => {});
if (dbUrlForTest2 !== undefined) process.env.DATABASE_URL = dbUrlForTest2;

assert.strictEqual(statusCode, 200);
assert.strictEqual(jsonRes.success, true);
assert.strictEqual(jsonRes.count, 2);
console.log('  [Pass] Батч из 2 событий успешно обработан с кодом 200: { success: true, count: 2 }');
console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

console.log('📌 ТЕСТ 3: если БД задана и insert падает — 500, клиент не дропает очередь');
const savedDbUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = 'postgres://analytics-test';
const origConnect = pool.connect;
pool.connect = async () => {
  throw new Error('insert fail');
};
statusCode = 200;
jsonRes = null;
await layer.route.stack[0].handle(mockReqValid, mockRes, () => {});
assert.strictEqual(statusCode, 500);
assert.ok(jsonRes.error);
pool.connect = origConnect;
if (savedDbUrl === undefined) delete process.env.DATABASE_URL;
else process.env.DATABASE_URL = savedDbUrl;
console.log('✅ ТЕСТ 3 УСПЕШНО ПРОЙДЕН!\n');

console.log('🎉 =========================================================');
console.log('🎉 ВСЕ БЭКЕНД ТЕСТЫ TASK-066 УСПЕШНО ПРОЙДЕНЫ!');
console.log('🎉 =========================================================');
