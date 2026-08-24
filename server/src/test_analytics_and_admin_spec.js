// server/src/test_analytics_and_admin_spec.js
// Юнит-тесты для TASK-067, TASK-068, TASK-069, TASK-070

import assert from 'assert';
import analyticsRouter from './routes/analytics.js';
import adminRouter from './routes/admin.js';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ TASK-067..070: Аналитика и Admin Dashboard');
console.log('🧪 =========================================================\n');

function mockRes() {
  let statusCode = 200;
  let jsonRes = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonRes = data;
      return this;
    },
    get code() { return statusCode; },
    get data() { return jsonRes; }
  };
}

// 📌 ТЕСТ 1: TASK-067 — Retention API (GET /api/analytics/retention)
console.log('📌 ТЕСТ 1: GET /api/analytics/retention (TASK-067)');
const retentionLayer = analyticsRouter.stack.find(s => s.route && s.route.path === '/retention');
assert.ok(retentionLayer, 'Роут /retention должен быть объявлен');

const res1 = mockRes();
await retentionLayer.route.stack[0].handle({ query: {} }, res1, () => {});

assert.strictEqual(res1.code, 200);
assert.ok(typeof res1.data.d1_retention === 'number');
assert.ok(typeof res1.data.d7_retention === 'number');
assert.ok(typeof res1.data.d30_retention === 'number');
assert.ok(typeof res1.data.total_users === 'number');
console.log('  [Pass] Эндпоинт retention отдал валидные метрики:', res1.data);
console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

// 📌 ТЕСТ 2: TASK-068 — Monetization API (GET /api/analytics/monetization)
console.log('📌 ТЕСТ 2: GET /api/analytics/monetization (TASK-068)');
const monetizationLayer = analyticsRouter.stack.find(s => s.route && s.route.path === '/monetization');
assert.ok(monetizationLayer, 'Роут /monetization должен быть объявлен');

const res2 = mockRes();
await monetizationLayer.route.stack[0].handle({ query: {} }, res2, () => {});

assert.strictEqual(res2.code, 200);
assert.ok(typeof res2.data.fill_rate_pct === 'number');
assert.ok(typeof res2.data.completion_rate_pct === 'number');
assert.ok(typeof res2.data.ads_per_dau === 'number');
assert.ok(Array.isArray(res2.data.ad_stats_by_type));
console.log('  [Pass] Эндпоинт monetization отдал статистику рекламы:', res2.data);
console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

// 📌 ТЕСТ 3: TASK-069 — Gameplay API (GET /api/analytics/gameplay)
console.log('📌 ТЕСТ 3: GET /api/analytics/gameplay (TASK-069)');
const gameplayLayer = analyticsRouter.stack.find(s => s.route && s.route.path === '/gameplay');
assert.ok(gameplayLayer, 'Роут /gameplay должен быть объявлен');

const res3 = mockRes();
await gameplayLayer.route.stack[0].handle({ query: {} }, res3, () => {});

assert.strictEqual(res3.code, 200);
assert.ok(Array.isArray(res3.data.max_level_distribution));
assert.ok(res3.data.funnel);
assert.ok(res3.data.button_usage);
console.log('  [Pass] Эндпоинт gameplay отдал воронку и распределение уровней:', res3.data);
console.log('✅ ТЕСТ 3 УСПЕШНО ПРОЙДЕН!\n');

// 📌 ТЕСТ 4: TASK-070 — Admin Dashboard API & Auth (GET /api/admin/dashboard)
console.log('📌 ТЕСТ 4: GET /api/admin/dashboard и Авторизация Токена (TASK-070)');
const dashboardLayer = adminRouter.stack.find(s => s.route && s.route.path === '/dashboard');
assert.ok(dashboardLayer, 'Роут /dashboard должен быть объявлен');

// Запрос с токеном
const res4 = mockRes();
const mockReqAuth = {
  headers: { authorization: 'Bearer cat_empire_admin_secret_token_2026' },
  query: {}
};

const authHandler = dashboardLayer.route.stack[0].handle;
const controllerHandler = dashboardLayer.route.stack[1].handle;

await authHandler(mockReqAuth, res4, async () => {
  await controllerHandler(mockReqAuth, res4);
});

assert.strictEqual(res4.code, 200);
assert.ok(res4.data.activity);
assert.ok(typeof res4.data.activity.dau_today === 'number');
assert.ok(res4.data.retention);
assert.ok(res4.data.monetization);
assert.ok(res4.data.gameplay);
assert.ok(Array.isArray(res4.data.top_users));
assert.ok(res4.data.purchases, 'Дашборд должен отдавать кассу');
assert.ok(typeof res4.data.purchases.today === 'number');
assert.ok(Array.isArray(res4.data.purchases.by_pack));
assert.ok(Array.isArray(res4.data.purchases.recent));
assert.ok(Array.isArray(res4.data.buttons), 'Дашборд должен отдавать клики кнопок');
assert.ok(res4.data.buttons.length >= 5);
assert.ok(res4.data.buttons.some((b) => b.event === 'session_start'), 'Запуск двора — не ролик');
assert.strictEqual(res4.data.day_tz, 'Europe/Moscow');
assert.ok(res4.data.gameplay.funnel, 'Воронка двора');
assert.ok(typeof res4.data.gameplay.funnel.started_today === 'number');
assert.ok(typeof res4.data.gameplay.funnel.filled_today === 'number');
assert.ok(res4.data.events, 'Дашборд должен отдавать ленту событий');
assert.ok(typeof res4.data.events.today_total === 'number');
assert.ok(Array.isArray(res4.data.events.by_type));
assert.ok(Array.isArray(res4.data.events.recent));
assert.ok(res4.data.ads, 'Дашборд должен отдавать рекламу');
assert.ok(typeof res4.data.ads.requested_today === 'number');
assert.ok(Array.isArray(res4.data.ads.by_type));
assert.ok(Array.isArray(res4.data.ads.reasons));
assert.ok(typeof res4.data.ads.failed_users === 'number', 'Сколько уникальных игроков не увидели ролик');
if (res4.data.ads.reasons[0]) {
  assert.ok(typeof res4.data.ads.reasons[0].users === 'number');
}
assert.ok(Array.isArray(res4.data.ads.recent));
console.log('  [Pass] Авторизация администратора прошла успешно, возвращены данные дашборда');
console.log('✅ ТЕСТ 4 УСПЕШНО ПРОЙДЕН!\n');

console.log('🎉 =========================================================');
console.log('🎉 ВСЕ ТЕСТЫ TASK-067..070 УСПЕШНО ПРОЙДЕНЫ!');
console.log('🎉 =========================================================');
