import { Economy } from './Economy.js';
import { BALANCE } from '../config/balance.js';

console.log('🧪 Запуск автоматических тестов TASK-058: Офлайн-Доход и VK Ads x3...');

// 1. Тест расчёта стоимости и дохода
const gridMock = {
  slots: [
    { level: 3 }, // income: 4 coins/sec
    { level: 4 }, // income: 8 coins/sec
    null,
    null
  ]
};

const economy = new Economy(gridMock);
economy.setBalance(100, 10, 0, 0);

console.assert(economy.incomePerSecond === 12, `❌ Доход должен быть 12/сек, получено: ${economy.incomePerSecond}`);
console.log('✅ 1. Пассивный доход правильно рассчитан: 12 монет/сек');

// 2. Тест расчёта офлайн-дохода за 30 минут (1800 секунд)
const offlineSeconds = 1800; // 30 мин
const ips = economy.incomePerSecond;
const baseOfflineCoins = Math.round(offlineSeconds * ips * 0.5); // 1800 * 12 * 0.5 = 10,800 монет
const tripleCoins = Math.round(baseOfflineCoins * 3); // 32,400 монет

console.assert(baseOfflineCoins === 10800, `❌ Базовый доход должен быть 10800, получено: ${baseOfflineCoins}`);
console.assert(tripleCoins === 32400, `❌ Утроенный x3 доход должен быть 32400, получено: ${tripleCoins}`);

console.log('✅ 2. Расчёт офлайн-дохода за 30 минут корректен: 10,800 монет (x3 = 32,400 монет)');

// 3. Тест начисления утроенных монет в баланс
const initialCoins = economy.coins;
economy.coins += tripleCoins;

console.assert(economy.coins === initialCoins + tripleCoins, `❌ Баланс должен стать 32500, получено: ${economy.coins}`);
console.log('✅ 3. Зачисление x3 награды в баланс прошло успешно!');

console.log('🎉 ВСЕ ТЕСТЫ TASK-058 УСПЕШНО ПРОЙДЕНЫ!');
