import { Grid } from './Grid.js';
import { Cat } from './Cat.js';
import { MergeEngine } from './MergeEngine.js';

function testMergeEngine() {
  console.log('--- Тестирование MergeEngine ---');
  
  // Создаём мок-сетку без генерации PixiJS DOM
  const mockGrid = {
    slots: new Array(25).fill(null),
    getCatAtSlot(i) { return this.slots[i]; },
    removeCat(i) { this.slots[i] = null; },
    addCat(cat, i) { this.slots[i] = cat; cat.slotIndex = i; }
  };

  let mergeLogged = null;
  const engine = new MergeEngine(mockGrid, (newLevel, slotIndex) => {
    mergeLogged = { newLevel, slotIndex };
  });

  // 1. Тест canMerge на пустые слоты
  console.log('1. canMerge на пустые слоты (должно быть false):', engine.canMerge(0, 1) === false ? '✅ УСПЕШНО' : '❌ ОШИБКА');

  // 2. Добавляем двух котиков 1-го уровня в слоты 0 и 1
  mockGrid.slots[0] = { level: 1, slotIndex: 0 };
  mockGrid.slots[1] = { level: 1, slotIndex: 1 };
  console.log('2. canMerge на слоты с одинаковыми котиками 1-го уровня:', engine.canMerge(0, 1) === true ? '✅ УСПЕШНО' : '❌ ОШИБКА');

  // 3. Добавляем котика 2-го уровня в слот 2
  mockGrid.slots[2] = { level: 2, slotIndex: 2 };
  console.log('3. canMerge на слоты с разными уровнями (1 и 2):', engine.canMerge(0, 2) === false ? '✅ УСПЕШНО' : '❌ ОШИБКА');

  // 4. Проверка уровня 15 (MAX_CAT_LEVEL)
  mockGrid.slots[3] = { level: 15, slotIndex: 3 };
  mockGrid.slots[4] = { level: 15, slotIndex: 4 };
  console.log('4. canMerge на котиков макс уровня 15 (должно быть false):', engine.canMerge(3, 4) === false ? '✅ УСПЕШНО' : '❌ ОШИБКА');

  console.log('\n--- Все тесты MergeEngine выполнены ---');
}

testMergeEngine();
