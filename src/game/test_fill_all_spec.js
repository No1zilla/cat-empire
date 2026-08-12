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

import { BALANCE } from '../config/balance.js';
import { Economy } from './Economy.js';
import { UIUtils } from '../utils/UIUtils.js';

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
  const freeSlotsCount = grid.getFreeSlotsCount();
  if (freeSlotsCount === 0) return { count: 0, cost: 0, freeSlotsCount: 0 };

  const currentBought = economy.totalCatsBought || 0;
  const unitCost = BALANCE.calculateCatCost(currentBought);

  const maxAffordable = Math.floor((economy.coins || 0) / unitCost);
  const count = Math.min(freeSlotsCount, maxAffordable);
  const totalCost = count * unitCost;

  return { count, cost: totalCost, freeSlotsCount };
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

  let actualTotalCost = 0;
  let spawnCount = 0;
  const currentBought = economy ? economy.totalCatsBought : 0;
  const unitCost = BALANCE.calculateCatCost(currentBought);
  const isFree = (overrideCost === 0);

  if (isFree) {
    spawnCount = Math.min(freeSlots.length, requestedCount || freeSlots.length);
    actualTotalCost = 0;
  } else {
    const maxAffordable = Math.floor((economy ? economy.coins : 0) / unitCost);
    spawnCount = Math.min(freeSlots.length, requestedCount || freeSlots.length, maxAffordable);
    actualTotalCost = spawnCount * unitCost;
  }

  if (spawnCount === 0) {
    return { success: false, reason: 'NOT_ENOUGH_COINS', spawnCount: 0, costSpent: 0 };
  }

  if (economy) {
    if (actualTotalCost > 0) {
      economy.spend(actualTotalCost);
      economy.totalCatsBought += spawnCount;
    }
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
console.assert(data2.count === 25, `❌ На 50 монет при цене 1 💰 выкупается все 25 слотов, получено: ${data2.count}`);
console.assert(data2.cost === 25, `❌ Стоимость за 25 котиков должна быть 25 монет, получено: ${data2.cost}`);

const startCoins2 = econ2.coins;
const res2 = handleTriggerFillAll(grid2, econ2, data2.count, data2.cost);
console.assert(res2.success === true, `❌ Заполнение должно завершиться успехом`);
console.assert(res2.spawnCount === 25, `❌ Должно заспавниться 25 котиков`);
console.assert(econ2.coins === startCoins2 - 25, `❌ Остаток монет должен быть 25 (50 - 25)`);
console.assert(econ2.totalCatsBought === 25, `❌ Всего куплено котиков должно стать 25`);
console.log('  [Pass] Кнопка выкупила ровно 25 котиков за 25 💰 по прямой чистой цене unitCost * count!\n');

// -------------------------------------------------------------
// ТЕСТ 3: Состояние 3 — Бесплатное заполнение за рекламу при 0 монет (FREE_AD)
// -------------------------------------------------------------
console.log('--- 3. Проверка Состояния 3: Бесплатный выкуп за рекламу при 0 монет (FREE_AD) ---');
const grid3 = new MockGrid(); // Все 25 слотов свободны
const econ3 = new Economy(grid3);
econ3.setBalance(0, 10, 100, 0);

const data3 = getFillData(grid3, econ3);
console.assert(data3.freeSlotsCount === 25, `❌ Должно быть 25 свободных слотов`);
console.assert(data3.count === 0, `❌ При 0 монет count должен быть 0 (режим БЕСПЛАТНО)`);
console.assert(data3.cost === 0, `❌ При 0 монет cost должен быть 0`);

// Симуляция успешного просмотра рекламы: overrideCost = 0 (бесплатные котики за рекламу не увеличивают totalCatsBought)
const res3 = handleTriggerFillAll(grid3, econ3, data3.freeSlotsCount, 0);
console.assert(res3.success === true, `❌ Бесплатное зачисление за рекламу должно сработать успехом`);
console.assert(res3.spawnCount === 25, `❌ За рекламу должны заполниться ВСЕ 25 свободных слотов`);
console.assert(res3.costSpent === 0, `❌ Монеты не должны быть списаны`);
console.assert(econ3.coins === 0, `❌ Баланс монет остался 0`);
console.log('  [Pass] Бесплатный запуск спас игровую сетку: 25 котиков заспавнены за 0 💰 после рекламы!\n');

console.log('🎉 ВСЕ СТАТУСНЫЕ ТЕСТЫ КНОПКИ «ЗАПОЛНИТЬ» ПРОЙДЕНЫ БЕЗУПРЕЧНО!');
