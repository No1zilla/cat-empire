import assert from 'node:assert';
import { quoteFillAll } from '../../src/game/fillAllPurchase.js';

export function runFillAllTests() {
  console.log('🧪 Тестирование «Заполнить»: только за монеты, без рекламы...');

  const broke = quoteFillAll(25, 0, 0);
  assert.strictEqual(broke.count, 0, 'При 0 монет котов не покупаем');
  assert.strictEqual(broke.cost, 0);
  assert.ok(broke.fullCost > 0, 'Цена поля остаётся платной');

  const paid = quoteFillAll(25, 50, 0);
  assert.ok(paid.count > 0, 'При монетах заполнение покупает котов');
  assert.ok(paid.cost > 0, 'Списываются монеты');
  assert.ok(paid.cost <= 50);
  assert.strictEqual(paid.count, 10, 'На 50 монет при растущей цене — 10 котов, не поле даром');
  assert.strictEqual(paid.cost, 46);

  const partial = quoteFillAll(10, 20, 5);
  assert.ok(partial.count > 0 && partial.count < 10, 'Если монет мало — только сколько хватает');
  assert.strictEqual(partial.count, 3);
  assert.strictEqual(partial.cost, 18);

  console.log('  ✅ Заполнить всегда за монеты, бесплатного пути нет');
}
