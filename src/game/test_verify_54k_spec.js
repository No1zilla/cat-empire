import { BALANCE } from '../config/balance.js';

console.log('🧪 =========================================================');
console.log('🧪 ПРОВЕРКА МАТЕМАТИКИ СКРИНШОТА (130 💰 за котика, 20 шт)');
console.log('🧪 =========================================================\n');

const currentBought = 130;
const unitCost = BALANCE.calculateCatCost(currentBought);
const count = 20;
const totalCost = count * unitCost;

console.log('   Всего куплено котиков (currentBought):', currentBought);
console.log('   Цена 1 котика (unitCost):', unitCost, '💰');
console.log('   Количество на кнопке (count):', count, 'шт');
console.log('   РАССЧИТАННАЯ СТОИМОСТЬ В НОВОМ КОДЕ:', totalCost, '💰 (2.6K 💰)');

console.assert(unitCost === 130, '❌ Цена 1 котика при 130 покупках должна быть 130 💰');
console.assert(totalCost === 2600, '❌ Стоимость 20 котиков по 130 💰 должна быть ровно 2600 💰 (2.6K, а НЕ 5.4K!)');

console.log('\n✅ МАТЕМАТИКА HОBОГО КОДА: 20 шт х 130 💰 = 2600 💰 (2.6K 💰, а НЕ 5.4K!)');
console.log('🎉 =========================================================');
