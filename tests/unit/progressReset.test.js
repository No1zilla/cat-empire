import assert from 'node:assert';
import { shouldRestoreProgressFloor } from '../../server/src/utils/progressFloor.js';
import { isStarterSnapshot } from '../../src/services/StorageService.js';

export function runProgressResetTests() {
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

  console.log('  ✅ Сброс остаётся чистым стартом, случайный вайп по-прежнему ловится');
}
