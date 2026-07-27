/**
 * Единый модуль баланса и математических формул «Империи Котиков»
 */

export const BALANCE = {
  // Начальные значения
  INITIAL_COINS: 100,
  INITIAL_GEMS: 10,
  INITIAL_MAX_LEVEL: 1,

  // Стоимость котика: 10 монет + 1 монета за каждую покупку
  calculateCatCost(totalCatsBought = 0) {
    return 10 + (Number(totalCatsBought) || 0);
  },

  // Пассивный доход котика уровня N = 2^(level - 1)
  calculateCatIncome(level) {
    const l = Number(level) || 1;
    return Math.pow(2, l - 1);
  },

  // Рассчитать доход всей сетки
  calculateTotalGridIncome(slots) {
    if (!Array.isArray(slots)) return 0;
    return slots.reduce((total, cat) => {
      if (cat && cat.level) {
        return total + BALANCE.calculateCatIncome(cat.level);
      }
      return total;
    }, 0);
  }
};

export default BALANCE;
