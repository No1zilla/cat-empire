import { runBalanceTests } from './unit/balance.test.js';
import { runEventBusTests } from './unit/eventBus.test.js';
import { runGridTests } from './unit/grid.test.js';

console.log('🚀 ЗАПУСК ПОЛНОЙ ПРОГРАММНОЙ СЮИТЫ АВТО-ТЕСТОВ...');
console.log('----------------------------------------------------');

try {
  runBalanceTests();
  runEventBusTests();
  runGridTests();
  console.log('----------------------------------------------------');
  console.log('🎉 ВСЕ ПРОГРАММНЫЕ АВТО-ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! (100% GREEN)');
} catch (error) {
  console.error('❌ ОШИБКА В АВТО-ТЕСТАХ:', error);
  process.exit(1);
}
