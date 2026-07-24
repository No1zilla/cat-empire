import { CONFIG } from '../config.js';
import { Cat } from './Cat.js';

// Движок проверки и выполнения объединения (merge) котиков
export class MergeEngine {
  constructor(grid, onMerge) {
    this.grid = grid;
    this.onMerge = onMerge || (() => {}); // (newLevel, slotIndex) => void
  }

  // Проверка возможности объединения слота A в слот B
  canMerge(slotIndexA, slotIndexB) {
    if (slotIndexA === slotIndexB) return false;

    const catA = this.grid.getCatAtSlot ? this.grid.getCatAtSlot(slotIndexA) : this.grid.slots[slotIndexA];
    const catB = this.grid.getCatAtSlot ? this.grid.getCatAtSlot(slotIndexB) : this.grid.slots[slotIndexB];

    if (!catA || !catB) return false;

    // Уровни котиков должны совпадать и быть меньше MAX_CAT_LEVEL (15)
    return catA.level === catB.level && catA.level < CONFIG.MAX_CAT_LEVEL;
  }

  // Выполнение объединения двух котиков
  merge(slotIndexA, slotIndexB) {
    if (!this.canMerge(slotIndexA, slotIndexB)) {
      return null;
    }

    const catA = this.grid.slots[slotIndexA];
    const newLevel = catA.level + 1;

    // Удаляем обоих котиков со сцены и из слотов
    this.grid.removeCat(slotIndexA);
    this.grid.removeCat(slotIndexB);

    // Создаём нового котика повышенного уровня
    const newCat = new Cat(newLevel, slotIndexB);
    this.grid.addCat(newCat, slotIndexB);

    // Вызываем коллбэк успешного merge
    if (typeof this.onMerge === 'function') {
      this.onMerge(newLevel, slotIndexB);
    }

    return newCat;
  }
}

export default MergeEngine;
