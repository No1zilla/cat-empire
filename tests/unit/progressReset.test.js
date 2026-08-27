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

  // TASK-109: флаг сброса залипал навсегда. resetSave становился true у любого
  // сохранения, пока флаг стоял, а снять флаг мог только код под `!resetSave` —
  // условие противоречило себе. Итог: loadProgress на каждой перезагрузке отдавал
  // чистые 100 монет и записывал их в VK Storage поверх настоящей империи.
  global.localStorage = new LocalStorageMock();
  localStorage.setItem('cat_empire_is_reset', '1');

  const afterReset = new StorageService();
  afterReset.lastLoadVerified = true;
  let cloudWrites = 0;
  afterReset._writeCloud = async () => { cloudWrites += 1; };

  const realEmpire = {
    coins: 50000,
    gems: 30,
    maxCatLevel: 8,
    totalCatsBought: 120,
    totalMerges: 40,
    gridState: [{ slotIndex: 0, catLevel: 8 }],
    updatedAt: Date.now()
  };
  await afterReset.saveProgress(realEmpire);

  assert.strictEqual(
    localStorage.getItem('cat_empire_is_reset'),
    null,
    'Первое сохранение реального прогресса снимает флаг сброса'
  );

  const reloaded = await afterReset.loadProgress();
  assert.strictEqual(reloaded.maxCatLevel, 8, 'После перезагрузки уровень не откатывается в 1');
  assert.strictEqual(reloaded.totalMerges, 40, 'После перезагрузки слияния на месте');
  assert.strictEqual(reloaded.coins, 50000, 'После перезагрузки монеты на месте');

  // Стартовое состояние сразу после сброса флаг не снимает: империя из облака
  // не должна вернуться, пока игрок не сыграл заново.
  global.localStorage = new LocalStorageMock();
  localStorage.setItem('cat_empire_is_reset', '1');
  const stillReset = new StorageService();
  stillReset.lastLoadVerified = true;
  await stillReset.saveProgress({
    coins: 100, gems: 10, maxCatLevel: 1, totalCatsBought: 0, totalMerges: 0,
    gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }],
    updatedAt: Date.now()
  });
  assert.strictEqual(
    localStorage.getItem('cat_empire_is_reset'),
    '1',
    'Стартовый снимок после сброса флаг не снимает'
  );

  global.localStorage = previousLs;

  console.log('  ✅ Сброс остаётся чистым стартом, случайный вайп по-прежнему ловится');
  console.log('  ✅ Флаг сброса снимается первым реальным прогрессом и не обнуляет игру');
}
