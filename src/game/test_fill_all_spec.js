// Polyfill localStorage for Node environment
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
import { quoteFillAll } from './fillAllPurchase.js';

console.log('🧪 ЗАПУСК СПЕЦИАЛИЗИРОВАННОГО ТЕСТ-СУИТА КНОПКИ «ЗАПОЛНИТЬ» (FillAllButton State Machine)...\n');

// Простой мок сетки 5x5 (25 слотов)
class MockGrid {
  constructor() {
    this.slots = new Array(25).fill(null);
  }
  getFreeSlotsCount() {
    return this.slots.filter(s => s === null).length;
  }
}

// Эмулятор бизнес-логики getFillData() из FillAllButton
function getFillData(grid, economy) {
  if (!grid || !economy) return { count: 0, cost: 0, freeSlotsCount: 0 };
  return quoteFillAll(grid.getFreeSlotsCount(), economy.coins, economy.totalCatsBought || 0);
}

// Эмулятор вызова обработчика onTriggerFillAll из Game.js
function handleTriggerFillAll(grid, economy, requestedCount, overrideCost) {
  const freeSlots = [];
  for (let i = 0; i < 25; i++) {
    if (grid.slots[i] === null) {
      freeSlots.push(i);
    }
  }

  if (freeSlots.length === 0) {
    return { success: false, reason: 'FULL', spawnCount: 0, costSpent: 0 };
  }

  const quote = quoteFillAll(freeSlots.length, economy ? economy.coins : 0, economy ? economy.totalCatsBought : 0);
  const spawnCount = quote.count;
  const actualTotalCost = quote.cost;

  if (spawnCount === 0 || actualTotalCost <= 0) {
    return { success: false, reason: 'NOT_ENOUGH_COINS', spawnCount: 0, costSpent: 0 };
  }

  if (economy) {
    economy.spend(actualTotalCost);
    economy.totalCatsBought += spawnCount;
  }

  for (let i = 0; i < spawnCount; i++) {
    grid.slots[freeSlots[i]] = { level: 1 };
  }

  return { success: true, spawnCount, costSpent: actualTotalCost };
}

// -------------------------------------------------------------
// ТЕСТ 1: Состояние 1 — Поле полно (FULL)
// -------------------------------------------------------------
console.log('--- 1. Проверка Состояния 1: Поле полностью заполнено (FULL) ---');
const grid1 = new MockGrid();
grid1.slots.fill({ level: 1 }); // Заполняем все 25 слотов
const econ1 = new Economy(grid1);
econ1.setBalance(1000000, 10, 0, 0);

const data1 = getFillData(grid1, econ1);
console.assert(data1.freeSlotsCount === 0, `❌ Свободных мест должно быть 0`);
console.assert(data1.count === 0, `❌ Доступных покупок должно быть 0`);
console.assert(data1.cost === 0, `❌ Стоимость должна быть 0`);

const res1 = handleTriggerFillAll(grid1, econ1, data1.count, data1.cost);
console.assert(res1.success === false && res1.reason === 'FULL', `❌ При полном поле заполнение не должно срабатывать`);
console.log('  [Pass] Кнопка находится в режиме "ЗАПОЛНЕНО", клик заблокирован (0 мест)\n');

// -------------------------------------------------------------
// ТЕСТ 2: Состояние 2 — Платная покупка за монеты (BUY_PAID)
// -------------------------------------------------------------
console.log('--- 2. Проверка Состояния 2: Покупка за монеты (BUY_PAID) ---');
const grid2 = new MockGrid(); // Все 25 слотов свободны
const econ2 = new Economy(grid2);
econ2.setBalance(50, 10, 0, 0); // 50 монет. unitCost = 1 💰 per cat. 25 свободных слотов = 25 котиков за 25 💰

const data2 = getFillData(grid2, econ2);
console.assert(data2.freeSlotsCount === 25, `❌ Должно быть 25 свободных слотов`);
console.assert(data2.count === 10, `❌ На 50 монет при растущей цене выкупается 10 котов, получено: ${data2.count}`);
console.assert(data2.cost === 46, `❌ Стоимость 10 котов должна быть 46, получено: ${data2.cost}`);

const startCoins2 = econ2.coins;
const res2 = handleTriggerFillAll(grid2, econ2, data2.count, data2.cost);
console.assert(res2.success === true, `❌ Заполнение должно завершиться успехом`);
console.assert(res2.spawnCount === 10, `❌ Должно заспавниться 10 котиков`);
console.assert(econ2.coins === startCoins2 - 46, `❌ Остаток монет должен быть 4 (50 - 46)`);
console.assert(econ2.totalCatsBought === 10, `❌ Всего куплено котиков должно стать 10`);
console.log('  [Pass] Кнопка выкупила 10 котиков за 46 монет, без бесплатного режима!\n');

// -------------------------------------------------------------
// ТЕСТ 3: Состояние 3 — При 0 монет заполнение не бесплатное
// -------------------------------------------------------------
console.log('--- 3. Проверка Состояния 3: 0 монет — без рекламы и без бесплатных котов ---');
const grid3 = new MockGrid();
const econ3 = new Economy(grid3);
econ3.setBalance(0, 10, 100, 0);

const data3 = getFillData(grid3, econ3);
console.assert(data3.freeSlotsCount === 25, `❌ Должно быть 25 свободных слотов`);
console.assert(data3.count === 0, `❌ При 0 монет count должен быть 0`);
console.assert(data3.cost === 0, `❌ При 0 монет affordable cost должен быть 0`);
console.assert(data3.fullCost > 0, `❌ Полная цена поля должна быть больше 0`);

const res3 = handleTriggerFillAll(grid3, econ3, data3.freeSlotsCount, 0);
console.assert(res3.success === false && res3.reason === 'NOT_ENOUGH_COINS', `❌ При 0 монет заполнение не должно срабатывать`);
console.assert(res3.spawnCount === 0, `❌ Бесплатных котиков быть не должно`);
console.assert(econ3.coins === 0, `❌ Баланс монет остался 0`);
console.log('  [Pass] При нуле монет кнопка не даёт котов даром и не открывает рекламу!\n');

console.log('🎉 ВСЕ СТАТУСНЫЕ ТЕСТЫ КНОПКИ «ЗАПОЛНИТЬ» ПРОЙДЕНЫ БЕЗУПРЕЧНО!');
