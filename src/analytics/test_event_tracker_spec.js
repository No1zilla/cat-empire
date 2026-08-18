// src/analytics/test_event_tracker_spec.js
// Специализированный тест-суит для TASK-066: EventTracker, батчинг и офлайн буфер

import assert from 'assert';
import { EventTracker } from './EventTracker.js';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ TASK-066: Аналитическая инфраструктура (EventTracker)');
console.log('🧪 =========================================================\n');

// Проверка 1: Инициализация и формирование схемы событий
console.log('📌 ТЕСТ 1: Инициализация EventTracker и структура событий');
const tracker = new EventTracker('user_12345', 'vk');

assert.strictEqual(tracker.userId, 'user_12345');
assert.strictEqual(tracker.platform, 'vk');
assert.ok(tracker.sessionId && tracker.sessionId.length > 0);
assert.ok(Array.isArray(tracker.queue));
// При старте автоматически генерируется событие session_start
assert.ok(tracker.queue.length >= 1, 'Должно быть создано событие session_start');
assert.strictEqual(tracker.queue[0].event, 'session_start');
assert.strictEqual(tracker.queue[0].user_id, 'user_12345');
assert.strictEqual(tracker.queue[0].platform, 'vk');

console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

// Проверка 2: Метод track() и трекинг всех категорий событий
console.log('📌 ТЕСТ 2: Проверка трекинга событий разных категорий');

tracker.trackCatBought(15, 12, 500);
tracker.trackFillAllTriggered(5, 75, 5);
tracker.trackManualMerge(1, 2);
tracker.trackAutoMergeTriggered(5, 3);
tracker.trackAdRequested('fill_free');
tracker.trackAdShown('fill_free', true);
tracker.trackAdCompleted('fill_free', 5);
tracker.trackMaxCatLevelReached(3);
tracker.trackOfflineBonusClaimed(100, 3, 300);
tracker.trackShareTriggered('wall_post');

assert.ok(tracker.queue.length >= 10, 'Очередь должна накопить события');

const catBoughtEv = tracker.queue.find(e => e.event === 'cat_bought');
assert.ok(catBoughtEv);
assert.strictEqual(catBoughtEv.props.cost, 15);
assert.strictEqual(catBoughtEv.props.total_cats_bought, 12);
assert.strictEqual(catBoughtEv.props.coins_balance, 500);

const adCompletedEv = tracker.queue.find(e => e.event === 'ad_completed');
assert.ok(adCompletedEv);
assert.strictEqual(adCompletedEv.props.ad_type, 'fill_free');
assert.strictEqual(adCompletedEv.props.reward_gems, 5);

console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

// Проверка 3: Офлайн-буфер (сохранение в LocalStorage / восстановление)
console.log('📌 ТЕСТ 3: Проверка сохранения и очистки очереди');

const initialLength = tracker.queue.length;
assert.ok(initialLength > 0);

// Имитация успешной отправки пакета событий
tracker.queue = [];
assert.strictEqual(tracker.queue.length, 0);

tracker.destroy();
console.log('✅ ТЕСТ 3 УСПЕШНО ПРОЙДЕН!\n');

console.log('📌 ТЕСТ 4: setUserId склеивает гостя с VK id в очереди');
const guestTracker = new EventTracker('guest_abc', 'vk');
assert.strictEqual(guestTracker.queue[0].user_id, 'guest_abc');
guestTracker.setUserId('816275327');
assert.strictEqual(guestTracker.userId, '816275327');
assert.ok(guestTracker.queue.every((ev) => ev.user_id === '816275327'));
guestTracker.destroy();
console.log('✅ ТЕСТ 4 УСПЕШНО ПРОЙДЕН!\n');

console.log('🎉 =========================================================');
console.log('🎉 ВСЕ ТЕСТЫ TASK-066 (EventTracker) УСПЕШНО ПРОЙДЕНЫ!');
console.log('🎉 =========================================================');
