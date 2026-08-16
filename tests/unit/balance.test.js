import assert from 'node:assert';
import { BALANCE } from '../../src/config/balance.js';

export function runBalanceTests() {
  console.log('🧪 Тестирование формул баланса и цен (src/config/balance.js)...');

  // 1. Формула цены котика: max(1, totalCatsBought)
  assert.strictEqual(BALANCE.calculateCatCost(0), 1, 'Цена начального котика должна быть 1');
  assert.strictEqual(BALANCE.calculateCatCost(1), 1, 'Цена 2-го котика должна быть 1');
  assert.strictEqual(BALANCE.calculateCatCost(5), 5, 'Цена после 5 покупок должна быть 5');

  // 2. Формула пассивного дохода: 2^(level - 1)
  assert.strictEqual(BALANCE.calculateCatIncome(1), 1, 'Доход кота 1 ур должен быть 1');
  assert.strictEqual(BALANCE.calculateCatIncome(2), 2, 'Доход кота 2 ур должен быть 2');
  assert.strictEqual(BALANCE.calculateCatIncome(3), 4, 'Доход кота 3 ур должен быть 4');
  assert.strictEqual(BALANCE.calculateCatIncome(6), 32, 'Доход кота 6 ур должен быть 32');

  // 3. Расчёт общего дохода сетки
  const mockGrid = [{ level: 1 }, { level: 2 }, { level: 3 }, null];
  assert.strictEqual(BALANCE.calculateTotalGridIncome(mockGrid), 1 + 2 + 4, 'Общий доход сетки должен быть 7');

  console.log('  ✅ Единый модуль баланса BALANCE прошел все автоматические тесты!');
}
