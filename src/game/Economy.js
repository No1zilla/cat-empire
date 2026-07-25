import { getCatData } from '../utils/catVisuals.js';

// Класс управления экономикой (1.07 inflation & Target TTB 30s cap)
export class Economy {
  constructor(grid) {
    this.grid = grid;
    this.coins = 0;
    this.gems = 0;
    this.totalCatsBought = 0;
    this.incomePerSecond = 0;
    this._ticker = null;
    this.onUpdate = null; // (coins, gems, incomePerSecond) => void
  }

  // Расчёт стоимости 1-го котика (1.07 инфляция, кап Target TTB = 30 сек пассивного дохода)
  getCatCost() {
    const baseCost = Math.floor(10 * Math.pow(1.07, this.totalCatsBought || 0));
    // Ограничение Target TTB (не более 30 сек текущего пассивного дохода)
    const maxCap = Math.max(10, Math.floor((this.incomePerSecond || 0) * 30));
    return Math.min(baseCost, maxCap);
  }

  // Установить начальный баланс
  setBalance(coins, gems, totalCatsBought = 0) {
    this.coins = Number(coins) || 0;
    this.gems = Number(gems) || 0;
    this.totalCatsBought = Number(totalCatsBought) || 0;
    this._recalcIncome();
    this._notify();
  }

  // Пересчитать общий пассивный доход в секунду со всех котиков на сетке
  _recalcIncome() {
    let totalIncome = 0;
    if (this.grid && Array.isArray(this.grid.slots)) {
      this.grid.slots.forEach((cat) => {
        if (cat !== null && cat.level) {
          // Доход котика уровня N = 2^(level - 1)
          const catData = getCatData(cat.level);
          totalIncome += catData.income;
        }
      });
    }
    this.incomePerSecond = totalIncome;
  }

  // Запустить секундомер начисления оффлайн/онлайн пассивного дохода
  startTicker() {
    this.stopTicker();
    this._ticker = setInterval(() => {
      this.coins += this.incomePerSecond;
      this._recalcIncome();
      this._notify();
    }, 1000);
  }

  // Остановить тикер
  stopTicker() {
    if (this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }
  }

  // Оповестить подписчиков (например, HUD) об изменении состояния
  _notify() {
    if (typeof this.onUpdate === 'function') {
      this.onUpdate(this.coins, this.gems, this.incomePerSecond);
    }
  }

  // Проверка доступности средств
  canAfford(cost) {
    return this.coins >= cost;
  }

  // Списать средства
  spend(coins = 0, gems = 0) {
    if (!this.canAfford(coins)) {
      throw new Error('Недостаточно монет');
    }
    this.coins -= coins;
    this.gems -= gems;
    this._notify();
  }

  // Начисление гемов
  addGems(amount = 0) {
    this.gems += Number(amount) || 0;
    this._notify();
  }

  // Пересчёт дохода после merge или спавна
  recalcAfterMerge() {
    this._recalcIncome();
    this._notify();
  }
}

export default Economy;
