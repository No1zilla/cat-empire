import assert from 'node:assert';
import { shouldRestoreProgressFloor } from '../../server/src/utils/progressFloor.js';
import { isStarterSnapshot, StorageService } from '../../src/services/StorageService.js';

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

export async function runProgressResetTests() {
  console.log('🧪 Тестирование сброса прогресса vs анти-вайп...');

  assert.strictEqual(shouldRestoreProgressFloor({
    maxCatLevel: 1,
    totalMerges: 0,
    totalCatsBought: 0
  }), false, 'После сброса аналитика не поднимает уровень');

  assert.strictEqual(shouldRestoreProgressFloor({
    maxCatLevel: 6,
    totalMerges: 10,
    totalCatsBought: 20
  }), true, 'Живую империю пол аналитики может подстраховать');

  assert.strictEqual(isStarterSnapshot({
    maxCatLevel: 1,
    totalMerges: 0,
    totalCatsBought: 2
  }), true);

  assert.strictEqual(isStarterSnapshot({
    maxCatLevel: 2,
    totalMerges: 1,
    totalCatsBought: 3
  }), false);

  const previousLs = global.localStorage;
  global.localStorage = new LocalStorageMock();
  localStorage.setItem('cat_empire_is_reset', '1');

  const storage = new StorageService();
  let saveFinished = false;
  storage.saveProgress = async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    saveFinished = true;
  };

  const started = Date.now();
  const state = await storage.loadProgress();
  const elapsed = Date.now() - started;

  assert.ok(elapsed < 150, 'После сброса загрузка не ждёт облако');
  assert.strictEqual(saveFinished, false, 'Облако пишется в фоне, сплэш не стоит');
  assert.strictEqual(state.isReset, true);
  assert.strictEqual(state.coins, 100);
  assert.strictEqual(state.maxCatLevel, 1);

  global.localStorage = previousLs;

  console.log('  ✅ Сброс остаётся чистым стартом, случайный вайп по-прежнему ловится');
}
