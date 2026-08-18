import assert from 'node:assert';
import { StorageService } from '../../src/services/StorageService.js';

export function runStorageTests() {
  console.log('🧪 Тестирование Слияния Состояний StorageService (Smart State Merger)...');

  const storage = new StorageService();

  const serverState = {
    coins: 500,
    gems: 20,
    maxCatLevel: 4,
    totalMerges: 12,
    totalCatsBought: 40,
    updatedAt: 1_000,
    gridState: [{ slotIndex: 0, catLevel: 4 }]
  };

  const localState = {
    coins: 300,
    gems: 50,
    maxCatLevel: 2,
    totalMerges: 3,
    totalCatsBought: 8,
    gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
  };

  const merged = storage.mergeStates(serverState, localState);
  assert.strictEqual(merged.maxCatLevel, 4, 'Более сильный снимок побеждает по уровню');
  assert.strictEqual(merged.coins, 500, 'Снимок берётся целиком, не max() по полям');
  assert.strictEqual(merged.gridState[0].catLevel, 4, 'Сетка берётся из сильного снимка');

  const freshStarter = {
    coins: 116,
    gems: 10,
    maxCatLevel: 1,
    totalMerges: 0,
    totalCatsBought: 0,
    updatedAt: Date.now(),
    gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
  };
  const oldEmpire = {
    coins: 8000,
    gems: 40,
    maxCatLevel: 9,
    totalMerges: 80,
    totalCatsBought: 200,
    updatedAt: 1,
    gridState: [{ slotIndex: 0, catLevel: 9 }]
  };
  const rescued = storage.mergeStates(freshStarter, oldEmpire);
  assert.strictEqual(rescued.maxCatLevel, 9, 'Свежий старт не затирает старую империю');
  assert.strictEqual(rescued.coins, 8000);

  console.log('  ✅ Сервис хранения StorageService с конвергенцией состояний успешно прошел тесты!');
}
