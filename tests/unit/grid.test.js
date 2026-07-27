import assert from 'node:assert';

export function runGridTests() {
  console.log('🧪 Тестирование логики игрового поля 5x5 (Grid state)...');

  const mockSlots = new Array(25).fill(null);
  mockSlots[0] = { level: 1 };
  mockSlots[1] = { level: 1 };
  mockSlots[5] = { level: 3 };

  // Функция экспорта состояния
  const exportState = (slots) => {
    const state = [];
    slots.forEach((cat, index) => {
      if (cat) state.push({ slotIndex: index, catLevel: cat.level });
    });
    return state;
  };

  const exported = exportState(mockSlots);
  assert.strictEqual(exported.length, 3, 'Должно экспортироваться 3 кота');
  assert.deepStrictEqual(exported[0], { slotIndex: 0, catLevel: 1 });
  assert.deepStrictEqual(exported[1], { slotIndex: 1, catLevel: 1 });
  assert.deepStrictEqual(exported[2], { slotIndex: 5, catLevel: 3 });

  console.log('  ✅ Логика состояния сетки 5x5 пройдена успешно!');
}
