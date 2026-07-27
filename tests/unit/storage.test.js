import assert from 'node:assert';
import { StorageService } from '../../src/services/StorageService.js';

export function runStorageTests() {
  console.log('🧪 Тестирование Слияния Состояний StorageService (Smart State Merger)...');

  const storage = new StorageService();

  const serverState = {
    coins: 500,
    gems: 20,
    maxCatLevel: 4,
    gridState: [{ slotIndex: 0, catLevel: 4 }]
  };

  const localState = {
    coins: 300,
    gems: 50,
    maxCatLevel: 2,
    gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
  };

  const merged = storage.mergeStates(serverState, localState);

  assert.strictEqual(merged.coins, 500, 'Должно выбираться большее количество монет (500 > 300)');
  assert.strictEqual(merged.gems, 50, 'Должно выбираться большее количество гемов (50 > 20)');
  assert.strictEqual(merged.maxCatLevel, 4, 'Должен выбираться наибольший уровень котика (4 > 2)');
  assert.strictEqual(merged.gridState[0].catLevel, 4, 'Должна выбираться сетка с более продвинутыми котиками');

  console.log('  ✅ Сервис хранения StorageService с конвергенцией состояний успешно прошел тесты!');
}
