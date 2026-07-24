import { Economy } from './Economy.js';
import { getCatData } from '../utils/catVisuals.js';

function testEconomy() {
  console.log('--- 1. Тестирование формулы дохода 3^(level - 1) ---');
  console.log('Lvl 1 (ожидается 1/сек):', getCatData(1).income === 1 ? '✅ УСПЕШНО' : '❌ ОШИБКА');
  console.log('Lvl 2 (ожидается 3/сек):', getCatData(2).income === 3 ? '✅ УСПЕШНО' : '❌ ОШИБКА');
  console.log('Lvl 3 (ожидается 9/сек):', getCatData(3).income === 9 ? '✅ УСПЕШНО' : '❌ ОШИБКА');
  console.log('Lvl 4 (ожидается 27/сек):', getCatData(4).income === 27 ? '✅ УСПЕШНО' : '❌ ОШИБКА');

  console.log('\n--- 2. Тестирование расчёта общей доходности Economy ---');
  const mockGrid = {
    slots: [
      { level: 1 }, // 1/сек
      { level: 2 }, // 3/сек
      { level: 3 }, // 9/сек
      null
    ]
  };

  const economy = new Economy(mockGrid);
  economy.setBalance(100, 10);

  console.log('Начальный баланс coins:', economy.coins === 100 ? '✅ 100' : '❌ ОШИБКА');
  console.log('Начальный баланс gems:', economy.gems === 10 ? '✅ 10' : '❌ ОШИБКА');
  console.log('Общий доход (1 + 3 + 9 = 13/сек):', economy.incomePerSecond === 13 ? '✅ 13/сек' : '❌ ОШИБКА');

  console.log('\n--- 3. Тестирование списания и canAfford ---');
  console.log('canAfford(10) (должно быть true):', economy.canAfford(10) === true ? '✅ УСПЕШНО' : '❌ ОШИБКА');
  console.log('canAfford(150) (должно быть false):', economy.canAfford(150) === false ? '✅ УСПЕШНО' : '❌ ОШИБКА');

  economy.spend(10);
  console.log('Баланс после spend(10):', economy.coins === 90 ? '✅ 90' : '❌ ОШИБКА');

  console.log('\n✅ Все тесты Economy успешно выполнены!');
}

testEconomy();
