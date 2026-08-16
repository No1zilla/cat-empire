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

  // При равных timestamp/merges/bought побеждает первый снимок (serverState)
  assert.strictEqual(merged.coins, 500, 'При равных часах должен сохраняться снимок A (сервер)');
  assert.strictEqual(merged.gems, 20, 'Гемы берутся из выбранного снимка целиком, а не max() по полям');
  assert.strictEqual(merged.maxCatLevel, 4, 'Уровень котика берётся из выбранного снимка');
  assert.strictEqual(merged.gridState[0].catLevel, 4, 'Сетка берётся из выбранного снимка');

  console.log('  ✅ Сервис хранения StorageService с конвергенцией состояний успешно прошел тесты!');
}
