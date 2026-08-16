/**
 * Единый модуль баланса и математических формул «Империи Котиков»
 */

export const BALANCE = {
  // Начальные значения
  INITIAL_COINS: 100,
  INITIAL_GEMS: 10,
  INITIAL_MAX_LEVEL: 1,

  // Стоимость котика равна сумме купленных котиков: 0-1 покупка = 1 монета, n покупок = n монет
  calculateCatCost(totalCatsBought = 0) {
    const n = Math.max(0, Number(totalCatsBought) || 0);
    return Math.max(1, n);
  },

  // Базовая кнопка покупки спавнит 1 ур., после первой мяты — котика 2 ур.
  getSpawnCatLevel(maxUnlockedLevel = 1, mintPercent = 0) {
    if (Number(mintPercent) >= 15) return 2;
    return 1;
  },

  mintForClearedWorld(worldsCleared = 1) {
    const n = Math.max(1, Number(worldsCleared) || 1);
    return 10 + n * 5;
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
