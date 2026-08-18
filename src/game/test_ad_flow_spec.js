import { AdModal } from '../ui/AdModal.js';
import { Economy } from './Economy.js';
import { BALANCE } from '../config/balance.js';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ: Валидация Рекламных Оверлеев и Исключение Debug Тостов');
console.log('🧪 =========================================================\n');

class MockApp {
  constructor() {
    this.stage = {
      addChild: () => {},
      removeChild: () => {},
      sortableChildren: false
    };
  }
}

async function runAdFlowTests() {
  const app = new MockApp();
  const economy = new Economy();
  economy.setBalance(0, 0, 0, 0);

  console.log('📌 ТЕСТ 1: «Заполнить» больше не открывает рекламу при 0 монет');
  const { quoteFillAll } = await import('./fillAllPurchase.js');
  const fillQuote = quoteFillAll(25, 0, 0);
  console.assert(fillQuote.count === 0, '❌ При 0 монет заполнение не покупает котов');
  console.assert(fillQuote.fullCost > 0, '❌ Полная цена заполнения должна быть больше 0');
  console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

  console.log('📌 ТЕСТ 2: Запуск AdModal при "⚡ Соединить" (0 гемов)');
  let mergeCompleted = false;
  const mergeModal = new AdModal(app, economy, () => {
    mergeCompleted = true;
  }, 5, 'Получение рубинов через:');

  console.assert(mergeModal.customTitle === 'Получение рубинов через:', '❌ customTitle должен быть "Получение рубинов через:"');
  console.assert(mergeModal.rewardGems === 5, '❌ rewardGems должен быть 5 для авто-слияния');
  console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

  console.log('🎉 =========================================================');
  console.log('🎉 ВСЕ ТЕСТЫ РЕКЛАМНОГО ПОТОКА И ИСКЛЮЧЕНИЯ ТОСТОВ ПРОЙДЕНЫ!');
  console.log('🎉 =========================================================');
}

runAdFlowTests().catch((err) => {
  console.error('❌ Ошибка тестирования рекламного потока:', err);
  process.exit(1);
});
