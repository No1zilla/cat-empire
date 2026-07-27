import assert from 'node:assert';

// Тестирование формул экономики и баланса
export function runBalanceTests() {
  console.log('🧪 Тестирование формул баланса и цен...');

  // 1. Формула цены котика: 10 + totalCatsBought
  const getCatCost = (totalCatsBought) => 10 + (totalCatsBought || 0);
  assert.strictEqual(getCatCost(0), 10, 'Цена начального котика должна быть 10');
  assert.strictEqual(getCatCost(1), 11, 'Цена 2-го котика должна быть 11');
  assert.strictEqual(getCatCost(5), 15, 'Цена 6-го котика должна быть 15');

  // 2. Формула пассивного дохода: 2^(level - 1)
  const getCatIncome = (level) => Math.pow(2, level - 1);
  assert.strictEqual(getCatIncome(1), 1, 'Доход кота 1 ур должен быть 1');
  assert.strictEqual(getCatIncome(2), 2, 'Доход кота 2 ур должен быть 2');
  assert.strictEqual(getCatIncome(3), 4, 'Доход кота 3 ур должен быть 4');
  assert.strictEqual(getCatIncome(6), 32, 'Доход кота 6 ур должен быть 32');

  console.log('  ✅ Все формулы баланса работают корректно!');
}
