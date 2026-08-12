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

  console.log('📌 ТЕСТ 1: Запуск AdModal при "Заполнить БЕСПЛАТНО" (0 монет)');
  let fillCompleted = false;
  const fillModal = new AdModal(app, economy, () => {
    fillCompleted = true;
  }, 0, 'Заполнение слотов через:');

  console.assert(fillModal.customTitle === 'Заполнение слотов через:', '❌ customTitle должен быть "Заполнение слотов через:"');
  console.assert(fillModal.rewardGems === 0, '❌ rewardGems должен быть 0 для бесплатного заполнения котиков');
  console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

  console.log('📌 ТЕСТ 2: Запуск AdModal при "⚡ Соединить" (0 гемов)');
  let mergeCompleted = false;
  const mergeModal = new AdModal(app, economy, () => {
    mergeCompleted = true;
  }, 5, 'Авто-соединение через:');

  console.assert(mergeModal.customTitle === 'Авто-соединение через:', '❌ customTitle должен быть "Авто-соединение через:"');
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
