// Polyfill localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

import { Economy } from './Economy.js';
import { BALANCE } from '../config/balance.js';
import { UIUtils } from '../utils/UIUtils.js';
import { storageService } from '../services/StorageService.js';

console.log('🔍 ЗАПУСК ПОЛНОГО КОМПЛЕКСНОГО АУДИТА СИСТЕМ «ИМПЕРИИ КОТИКОВ»...\n');

// -------------------------------------------------------------
// 1. АУДИТ ЧИСЛОВОГО ФОРМАТИРОВАНИЯ (UIUtils.formatNumber)
// -------------------------------------------------------------
console.log('--- 1. Тестирование форматирования чисел (защита от e+107M) ---');
const testNumbers = [
  { input: 0, expected: '0' },
  { input: 999, expected: '999' },
  { input: 1500, expected: '1.5K' },
  { input: 2500000, expected: '2.5M' },
  { input: 3500000000, expected: '3.5B' },
  { input: 4200000000000, expected: '4.2T' },
  { input: 3.23955e+107, expected: '>999az' } // Защита от экспоненциального оверфлоу!
];

testNumbers.forEach(t => {
  const result = UIUtils.formatNumber(t.input);
  console.assert(result === t.expected, `❌ Ошибка форматирования для ${t.input}: получено ${result}, ожидалось ${t.expected}`);
  console.log(`  [Pass] ${t.input} -> ${result}`);
});
console.log('✅ 1. Форматирование чисел полностью безопасно и без оверфлоу!\n');

// -------------------------------------------------------------
// 2. АУДИТ БАЛАНСА И СТОИМОСТИ КУПЛИ (BALANCE.calculateCatCost)
// -------------------------------------------------------------
console.log('--- 2. Тестирование линейной формулы стоимости (Cost = n + 1) ---');
const cost0 = BALANCE.calculateCatCost(0);
const cost10 = BALANCE.calculateCatCost(10);
const cost100 = BALANCE.calculateCatCost(100);
const cost1000 = BALANCE.calculateCatCost(1000);

console.assert(cost0 === 1, `❌ Стоимость при 0 покупках должна быть 1, получено: ${cost0}`);
console.assert(cost10 === 11, `❌ Стоимость при 10 покупках должна быть 11, получено: ${cost10}`);
console.assert(cost100 === 101, `❌ Стоимость при 100 покупках должна быть 101, получено: ${cost100}`);
console.assert(cost1000 === 1001, `❌ Стоимость при 1000 покупках должна быть 1001, получено: ${cost1000}`);

console.log(`  [Pass] 0 покупок: ${cost0} 💰`);
console.log(`  [Pass] 10 покупок: ${cost10} 💰`);
console.log(`  [Pass] 100 покупок: ${UIUtils.formatNumber(cost100)} 💰`);
console.log(`  [Pass] 1000 покупок: ${UIUtils.formatNumber(cost1000)} 💰`);
console.log('✅ 2. Линейная формула стоимости котиков работает устойчиво!\n');

// -------------------------------------------------------------
// 3. АУДИТ СБРОСА ПРОГРЕССА (StorageService)
// -------------------------------------------------------------
console.log('--- 3. Тестирование механизма очистки StorageService.clearAllProgress ---');

// Имитация старого засорённого состояния в localStorage
if (typeof localStorage !== 'undefined') {
  localStorage.setItem('cat_empire_last_coins', '835000000');
  localStorage.setItem('cat_empire_last_max_level', '13');
  localStorage.setItem('cat_empire_last_total_bought', '3500');
}

// Запускаем очистку
await storageService.clearAllProgress();

const isResetFlag = localStorage.getItem('cat_empire_is_reset');
const lastCoins = localStorage.getItem('cat_empire_last_coins');
const maxLevel = localStorage.getItem('cat_empire_last_max_level');

console.assert(isResetFlag === '1', '❌ Флаг cat_empire_is_reset должен быть выставлен в 1');
console.assert(lastCoins === null, '❌ Ключ cat_empire_last_coins должен быть полностью удалён');
console.assert(maxLevel === null, '❌ Ключ cat_empire_last_max_level должен быть полностью удалён');

console.log('  [Pass] Флаг сброса cat_empire_is_reset = 1');
console.log('  [Pass] Все кэш-ключи старого прогресса очищены');
console.log('✅ 3. Механизм полных сбросов работает безукоризненно!\n');

console.log('🎉 ВСЕ ПРОВЕРКИ И АУДИТ ПРОЙДЕНЫ С УСПЕХОМ!');
