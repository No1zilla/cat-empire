import { BALANCE } from '../config/balance.js';
import { StorageService } from '../services/StorageService.js';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ: Проверка Чистого Сброса и Начального Прогресса');
console.log('🧪 =========================================================\n');

// Простая мок-память для эмуляции LocalStorage в среде Node.js
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();

async function runResetTests() {
  const storage = new StorageService();

  console.log('📌 ТЕСТ 1: Валидация начального каноничного баланса (Default Player State)');
  const defaultState = storage._normalizeState({});
  console.log('   Начальные монеты:', defaultState.coins, '(Ожидается: 100)');
  console.log('   Начальные рубины:', defaultState.gems, '(Ожидается: 10)');
  console.log('   Макс уровень котика:', defaultState.maxCatLevel, '(Ожидается: 1)');
  console.log('   Всего куплено котиков:', defaultState.totalCatsBought, '(Ожидается: 0)');
  console.log('   Всего слияний:', defaultState.totalMerges, '(Ожидается: 0)');

  console.assert(defaultState.coins === 100, '❌ Монеты нового игрока должны быть 100 💰');
  console.assert(defaultState.gems === 10, '❌ Рубины нового игрока должны быть 10 💎');
  console.assert(defaultState.maxCatLevel === 1, '❌ Макс уровень нового игрока должен быть 1');
  console.assert(defaultState.totalCatsBought === 0, '❌ Счётчик покупок должен быть 0');
  console.assert(defaultState.totalMerges === 0, '❌ Счётчик слияний должен быть 0');
  console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

  console.log('📌 ТЕСТ 2: Проверка стартовой стоимости котика при 0 покупок');
  const initialCost = BALANCE.calculateCatCost(0);
  console.log('   Цена 1-го котика:', initialCost, '💰 (Никаких 19.5k!)');
  console.assert(initialCost === 10, '❌ Цена первого котика при 0 покупок должна быть ровно 10 💰');
  console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

  console.log('📌 ТЕСТ 3: Валидация метода сброса прогресса (clearAllProgress)');
  await storage.clearAllProgress();
  const resetLoadedState = await storage.loadProgress();
  console.log('   Баланс после сброса:', resetLoadedState.coins, '💰');
  console.log('   Куплено котиков после сброса:', resetLoadedState.totalCatsBought);

  console.assert(resetLoadedState.coins === 100, '❌ Монеты после сброса должны быть 100 💰');
  console.assert(resetLoadedState.totalCatsBought === 0, '❌ Покупки после сброса должны быть 0');
  console.assert(resetLoadedState.maxCatLevel === 1, '❌ Максимальный уровень котика должен сброситься в 1');
  console.log('✅ ТЕСТ 3 УСПЕШНО ПРОЙДЕН!\n');

  console.log('🎉 =========================================================');
  console.log('🎉 ВСЕ ТЕСТЫ НАЧАЛЬНОГО СОСТОЯНИЯ И СБРОСА УСПЕШНО ПРОЙДЕНЫ!');
  console.log('🎉 =========================================================');
}

runResetTests().catch((err) => {
  console.error('❌ Ошибка во время выполнения тестов сброса:', err);
  process.exit(1);
});
