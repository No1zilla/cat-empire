import { CONFIG } from '../config.js';

/**
 * TASK-012: Система каскадного авто-слияния котиков на поле 5x5 с задержкой 120мс
 */
export class AutoMergeSystem {
  constructor(app, grid, mergeEngine, dragSystem, onMergeComplete) {
    this.app = app;
    this.grid = grid;
    this.mergeEngine = mergeEngine;
    this.dragSystem = dragSystem;
    this.onMergeComplete = onMergeComplete || (() => {});
    this.isMerging = false;
  }

  // Запуск процесса авто-слияния
  async runAutoMerge() {
    if (this.isMerging) return 0;
    this.isMerging = true;

    let totalMerges = 0;
    let foundPairInPass = true;

    while (foundPairInPass) {
      foundPairInPass = false;

      // Проверяем уровни от 1 до MAX_CAT_LEVEL - 1
      for (let level = 1; level < CONFIG.MAX_CAT_LEVEL; level++) {
        const matchingSlots = [];

        for (let i = 0; i < 25; i++) {
          const cat = this.grid.getCatAtSlot(i);
          if (cat && cat.level === level) {
            matchingSlots.push({ slotIndex: i, cat });
          }
        }

        // Если нашли хотя бы одну пару для слияния
        if (matchingSlots.length >= 2) {
          const slotA = matchingSlots[0].slotIndex;
          const slotB = matchingSlots[1].slotIndex;

          const newCat = this.mergeEngine.merge(slotA, slotB);

          if (newCat) {
            totalMerges++;
            foundPairInPass = true;

            // Воспроизводим анимацию эффекта merge
            if (this.dragSystem && typeof this.dragSystem._playMergeEffect === 'function') {
              this.dragSystem._playMergeEffect(slotB, newCat);
            }

            // Каскадная задержка 120мс между слияниями
            await new Promise((resolve) => setTimeout(resolve, 120));

            // После первого слияния сбрасываем цикл и ищем заново с 1-го уровня
            break;
          }
        }
      }
    }

    this.isMerging = false;

    if (totalMerges > 0 && typeof this.onMergeComplete === 'function') {
      this.onMergeComplete(totalMerges);
    }

    return totalMerges;
  }
}

export default AutoMergeSystem;
