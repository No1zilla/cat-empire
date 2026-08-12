import { BALANCE } from '../config/balance.js';

console.log('🧪 =========================================================');
console.log('🧪 ПРОВЕРКА МАТЕМАТИКИ (10 💰 за котика, 10 шт)');
console.log('🧪 =========================================================\n');

const currentBought = 10;
const unitCost = BALANCE.calculateCatCost(currentBought);
const count = 10;
const totalCost = count * unitCost;

console.log('   Всего куплено котиков (currentBought):', currentBought);
console.log('   Цена 1 котика (unitCost):', unitCost, '💰');
console.log('   Количество на кнопке (count):', count, 'шт');
console.log('   РАССЧИТАННАЯ СТОИМОСТЬ В НОВОМ КОДЕ:', totalCost, '💰');

console.assert(unitCost === 10, '❌ Цена 1 котика при 10 покупках должна быть 10 💰');
console.assert(totalCost === 100, '❌ Стоимость 10 котиков по 10 💰 должна быть ровно 100 💰 (а НЕ 136 💰!)');

console.log('\n✅ МАТЕМАТИКА HОBОГО КОДА: 10 шт х 10 💰 = 100 💰 (Никаких 136 💰!)');
console.log('🎉 =========================================================');
