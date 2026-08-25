import assert from 'node:assert';

/**
 * Жизненный цикл сессии (TASK-094).
 * beforeunload на мобильных часто не срабатывает, поэтому сессию закрывают
 * pagehide и visibilitychange. Проверяем, что при этом не рождаются дубли
 * и что короткая отлучка не плодит фантомные сессии.
 */
export async function runSessionLifecycleTests() {
  console.log('🧪 Тестирование жизненного цикла сессии (pagehide / фон / возврат)...');

  const listeners = { doc: {}, win: {} };
  const add = (bag) => (name, fn) => { (bag[name] = bag[name] || []).push(fn); };
  const fire = (bag, name) => (bag[name] || []).forEach((fn) => fn());

  global.window = {
    addEventListener: add(listeners.win),
    location: { origin: 'http://localhost' },
    innerWidth: 410,
    innerHeight: 700
  };
  global.document = {
    visibilityState: 'visible',
    addEventListener: add(listeners.doc)
  };
  // navigator в Node только для чтения — подменяем через defineProperty
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'test', sendBeacon: () => true },
    configurable: true,
    writable: true
  });
  global.localStorage = {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  };
  global.fetch = async () => ({ ok: true, json: async () => ({}) });

  const mod = await import('../../src/analytics/EventTracker.js');
  // Модуль поднимает синглтон с собственным setInterval — без этого прогон не завершится
  mod.eventTracker.destroy();
  const tracker = new mod.EventTracker('u1', 'vk');
  tracker.destroy();

  const names = () => tracker.queue.map((e) => e.event);
  const countOf = (n) => names().filter((x) => x === n).length;
  const firstSession = tracker.sessionId;

  assert.strictEqual(countOf('session_start'), 1, 'на старте ровно один session_start');

  // 1. Уход в фон закрывает сессию — раньше это делал только beforeunload
  global.document.visibilityState = 'hidden';
  fire(listeners.doc, 'visibilitychange');
  assert.strictEqual(countOf('session_end'), 1, 'visibilitychange→hidden закрывает сессию');

  // 2. pagehide прилетает следом на мобильных — второго события быть не должно
  fire(listeners.win, 'pagehide');
  assert.strictEqual(countOf('session_end'), 1, 'подряд идущий pagehide не даёт дубль');

  // 3. Короткая отлучка — та же сессия, без фантомного session_start
  global.document.visibilityState = 'visible';
  fire(listeners.doc, 'visibilitychange');
  assert.strictEqual(countOf('session_start'), 1, 'короткий возврат не плодит сессию');
  assert.strictEqual(tracker.sessionId, firstSession, 'session_id при этом не меняется');

  // 4. Долгая отлучка — новая сессия со сброшенными счётчиками
  tracker._bumpSessionCounter('merges', 3);
  global.document.visibilityState = 'hidden';
  tracker._lastSessionEndAt = 0; // прошло время, дебаунс уже не действует
  fire(listeners.doc, 'visibilitychange');
  tracker._hiddenAt = Date.now() - (31 * 60 * 1000); // вернулись через 31 минуту
  global.document.visibilityState = 'visible';
  fire(listeners.doc, 'visibilitychange');

  assert.strictEqual(countOf('session_start'), 2, 'после долгой отлучки начинается новая сессия');
  assert.notStrictEqual(tracker.sessionId, firstSession, 'у новой сессии свой id');
  assert.strictEqual(tracker.sessionCounters.merges, undefined, 'счётчики новой сессии обнулены');

  // 5. Счётчики попадают в session_end
  tracker._bumpSessionCounter('merges', 2);
  tracker._bumpSessionCounter('blocked', 1);
  tracker._lastSessionEndAt = 0;
  tracker.trackSessionEnd();
  const last = tracker.queue[tracker.queue.length - 1];
  assert.strictEqual(last.event, 'session_end');
  assert.strictEqual(last.props.merges, 2, 'слияния попали в session_end');
  assert.strictEqual(last.props.blocked, 1, 'отказы попали в session_end');
  assert.strictEqual(last.props.idle, false, 'сессия с действиями не помечена idle');

  // 6. Пустая сессия помечается idle — признак «зашёл и вышел»
  tracker.sessionCounters = {};
  tracker._lastSessionEndAt = 0;
  tracker.trackSessionEnd();
  const empty = tracker.queue[tracker.queue.length - 1];
  assert.strictEqual(empty.props.idle, true, 'сессия без действий помечена idle');

  // 7. У каждого события свой id — на нём держится дедупликация на сервере
  const ids = tracker.queue.map((e) => e.event_id);
  assert.strictEqual(new Set(ids).size, ids.length, 'event_id уникальны');
  assert.ok(ids.every(Boolean), 'event_id проставлен у всех событий');

  tracker.destroy();
  mod.eventTracker.destroy();
  delete global.window; delete global.document;
  delete global.localStorage; delete global.fetch;

  console.log('  ✅ Сессия закрывается по фону, дубли гасятся, долгая отлучка даёт новую сессию');
}
