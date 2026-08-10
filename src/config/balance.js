/**
 * Единый модуль баланса и математических формул «Империи Котиков»
 */

export const BALANCE = {
  // Начальные значения
  INITIAL_COINS: 100,
  INITIAL_GEMS: 10,
  INITIAL_MAX_LEVEL: 1,

  // Стоимость котика: идеально выверенный коэффициент роста 1.07 per buy (без упирания в тупик на 10+ уровнях)
  calculateCatCost(totalCatsBought = 0) {
    const n = Math.max(0, Number(totalCatsBought) || 0);
    return Math.floor(10 * Math.pow(1.07, n));
  },

  // Базовая кнопка покупки всегда спавнит котика 1-го уровня
  getSpawnCatLevel(maxUnlockedLevel = 1) {
    return 1;
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
