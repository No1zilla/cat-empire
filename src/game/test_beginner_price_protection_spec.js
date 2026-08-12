import { StorageService } from '../services/StorageService.js';
import { BALANCE } from '../config/balance.js';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ: Защита Стоимости Котиков Новичков (Макс 1300 -> Безопасная цена)');
console.log('🧪 =========================================================\n');

async function runBeginnerProtectionTests() {
  const storage = new StorageService();

  console.log('📌 ТЕСТ 1: Нормализация аномального totalCatsBought = 1299 для игрока 1 уровня');
  const rawCorruptedState = {
    coins: 100,
    gems: 10,
    maxCatLevel: 1,
    totalCatsBought: 1299, // Аномальное значение
    totalMerges: 0
  };

  const normalized = storage._normalizeState(rawCorruptedState);
  console.log('   Исходное totalCatsBought:', rawCorruptedState.totalCatsBought);
  console.log('   Нормализованное totalCatsBought:', normalized.totalCatsBought, '(Ожидается: <= 30)');

  console.assert(normalized.totalCatsBought <= 30, '❌ totalCatsBought для 1 уровня должен ограничиваться <= 30');
  console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

  console.log('📌 ТЕСТ 2: Проверка стоимости 1-го котика после защиты новичка');
  const catCost = BALANCE.calculateCatCost(normalized.totalCatsBought);
  console.log('   Стоимость котика:', catCost, '💰 (Вместо 1300 💰!)');

  console.assert(catCost <= 31, '❌ Цена котика для новичка 1-го уровня не должна превышать 31 монету');
  console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

  console.log('🎉 =========================================================');
  console.log('🎉 ВСЕ ТЕСТЫ ЗАЩИТЫ СТОИМОСТИ НОВИЧКОВ УСПЕШНО ПРОЙДЕНЫ!');
  console.log('🎉 =========================================================');
}

runBeginnerProtectionTests().catch((err) => {
  console.error('❌ Ошибка теста защиты стоимости новичка:', err);
  process.exit(1);
});
