import { getCatData } from '../utils/catVisuals.js';
import { BALANCE } from '../config/balance.js';

// Класс управления экономикой (Простая цена: 10 + totalCatsBought, ровно +1 монета за покупку)
export class Economy {
  constructor(grid) {
    this.grid = grid;
    this.coins = 0;
    this.gems = 0;
    this.totalCatsBought = 0;
    this.totalMerges = 0;
    this.incomePerSecond = 0;
    this._ticker = null;
    this.onUpdate = null; // (coins, gems, incomePerSecond) => void
  }

  // Простая понятная цена: 10 монет + 1 монета за каждую совершённую покупку (каждый клик +1!)
  getCatCost() {
    return BALANCE.calculateCatCost(this.totalCatsBought);
  }

  // Установить начальный баланс и счётчики статистики с умной авто-регенерацией
  setBalance(coins, gems, totalCatsBought = 0, totalMerges = 0) {
    this.coins = Number(coins) || 0;
    this.gems = Number(gems) || 0;
    let bought = Number(totalCatsBought) || 0;

    // УМНЫЙ ФОЛЛБЭК: Пересчитываем минимальное количество купленных котиков по котам на сетке
    let minBoughtFromGrid = 0;
    if (this.grid && Array.isArray(this.grid.slots)) {
      this.grid.slots.forEach((cat) => {
        if (cat && cat.level) {
          minBoughtFromGrid += Math.pow(2, cat.level - 1);
        }
      });
    }

    // Точная калибровка: totalCatsBought должен строго соответствовать весу котиков на сетке
    if (minBoughtFromGrid > 0) {
      this.totalCatsBought = minBoughtFromGrid;
    } else {
      this.totalCatsBought = bought;
    }
    this.totalMerges = Number(totalMerges) || 0;

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

  // Списание гемов
  spendGems(amount = 0) {
    if (this.gems < amount) {
      throw new Error('Недостаточно гемов');
    }
    this.gems -= Number(amount);
    this._notify();
  }

  // Пересчёт дохода после merge или спавна
  recalcAfterMerge() {
    this._recalcIncome();
    this._notify();
  }
}

export default Economy;
