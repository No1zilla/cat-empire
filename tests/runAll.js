import { runBalanceTests } from './unit/balance.test.js';
import { runEventBusTests } from './unit/eventBus.test.js';
import { runGridTests } from './unit/grid.test.js';
import { runMergeTests } from './unit/merge.test.js';
import { runSoundTests } from './unit/sound.test.js';

console.log('🚀 ЗАПУСК ПОЛНОЙ ПРОГРАММНОЙ СЮИТЫ АВТО-ТЕСТОВ (ФАЗА 2)...');
console.log('----------------------------------------------------');

try {
  runBalanceTests();
  runEventBusTests();
  runGridTests();
  runMergeTests();
  runSoundTests();
  console.log('----------------------------------------------------');
  console.log('🎉 ВСЕ ПРОГРАММНЫЕ АВТО-ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! (100% GREEN)');
} catch (error) {
  console.error('❌ ОШИБКА В АВТО-ТЕСТАХ:', error);
  process.exit(1);
}
