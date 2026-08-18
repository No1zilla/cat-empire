import { BALANCE } from '../config/balance.js';

/**
 * Сколько котиков «Заполнить» может купить за монеты. Бесплатного пути нет.
 */
export function quoteFillAll(freeSlotsCount, coins, totalCatsBought = 0) {
  const slots = Math.max(0, Number(freeSlotsCount) || 0);
  const bought = Math.max(0, Number(totalCatsBought) || 0);
  const purse = Math.max(0, Number(coins) || 0);

  let cost = 0;
  let count = 0;
  let fullCost = 0;

  for (let i = 0; i < slots; i++) {
    const catCost = BALANCE.calculateCatCost(bought + i);
    fullCost += catCost;
    if (purse >= cost + catCost) {
      cost += catCost;
      count++;
    }
  }

  return { count, cost, fullCost, freeSlotsCount: slots };
}

export default quoteFillAll;
