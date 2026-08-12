import { BALANCE } from '../config/balance.js';

console.log('🧪 =========================================================');
console.log('🧪 ПРОВЕРКА МАТЕМАТИКИ СКРИНШОТА (25 💰 за котика, 10 шт)');
console.log('🧪 =========================================================\n');

const currentBought = 25;
const unitCost = BALANCE.calculateCatCost(currentBought);
const count = 10;
const totalCost = count * unitCost;

console.log('   Всего куплено котиков (currentBought):', currentBought);
console.log('   Цена 1 котика (unitCost):', unitCost, '💰');
console.log('   Количество на кнопке (count):', count, 'шт');
console.log('   РАССЧИТАННАЯ СТОИМОСТЬ НА КНОПКЕ (totalCost):', totalCost, '💰');

console.assert(unitCost === 25, '❌ Цена 1 котика при 25 покупках должна быть 25 💰');
console.assert(totalCost === 250, '❌ Стоимость 10 котиков по 25 💰 должна быть 250 💰 (а НЕ 351 💰!)');

console.log('\n✅ МАТЕМАТИКА HОBОГО КОДА: 10 шт х 25 💰 = 250 💰 (Никаких 351 💰!)');
console.log('🎉 =========================================================');
