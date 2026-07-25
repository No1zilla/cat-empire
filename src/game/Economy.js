import { getCatData } from '../utils/catVisuals.js';

// Класс управления экономикой (Линейная динамическая цена: +1 монета за каждого котика на поле)
export class Economy {
  constructor(grid) {
    this.grid = grid;
    this.coins = 0;
    this.gems = 0;
    this.totalCatsBought = 0;
    this.totalCatsCreated = 0;
    this.totalMerges = 0;
    this.incomePerSecond = 0;
    this._ticker = null;
    this.onUpdate = null; // (coins, gems, incomePerSecond) => void
  }

  // Динамическая цена зависит от количества котиков НА ПОЛЕ: ровно +1 монета за каждого котика!
  getCatCost() {
    const activeCats = this.grid ? this.grid.getActiveCatsCount() : 0;
    return 10 + activeCats;
  }

  // Установить начальный баланс и счётчики статистики
  setBalance(coins, gems, totalCatsBought = 0, totalCatsCreated = 0, totalMerges = 0) {
    this.coins = Number(coins) || 0;
    this.gems = Number(gems) || 0;
    this.totalCatsBought = Number(totalCatsBought) || 0;
    this.totalCatsCreated = Number(totalCatsCreated) || Number(totalCatsBought) || 0;
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

  // Пересчёт дохода после merge или спавна — моментальное снижение/изменение цены на кнопке!
  recalcAfterMerge() {
    this._recalcIncome();
    this._notify();
  }
}

export default Economy;
