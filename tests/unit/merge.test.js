import assert from 'node:assert';

// Чистые функции скрещивания
export function canMergeCats(catA, catB) {
  if (!catA || !catB) return false;
  if (catA === catB) return false;
  return catA.level === catB.level && catA.level < 15;
}

export function getMergedCatLevel(level) {
  return Math.min(15, (Number(level) || 1) + 1);
}

export function runMergeTests() {
  console.log('🧪 Тестирование логики скрещивания котиков (Merge Engine)...');

  // 1. Нельзя скрестить с котиком того же слота
  const cat1 = { level: 1 };
  assert.strictEqual(canMergeCats(cat1, cat1), false, 'Нельзя скрестить кота самого с собой');

  // 2. Можно скрестить котов одинакового уровня
  const cat1A = { level: 1 };
  const cat1B = { level: 1 };
  assert.strictEqual(canMergeCats(cat1A, cat1B), true, 'Коты одинакового уровня 1 должны скрещиваться');
  assert.strictEqual(getMergedCatLevel(1), 2, 'Скрещивание 1+1 дает уровень 2');

  // 3. Нельзя скрестить котов разного уровня
  const cat2 = { level: 2 };
  assert.strictEqual(canMergeCats(cat1A, cat2), false, 'Коты разных уровней (1 и 2) не скрещиваются');

  // 4. Максимальный уровень равен 15
  const cat15A = { level: 15 };
  const cat15B = { level: 15 };
  assert.strictEqual(canMergeCats(cat15A, cat15B), false, 'Коты максимального 15 уровня не скрещиваются');

  console.log('  ✅ Все юнит-тесты скрещивания Merge Engine успешно пройдены!');
}
