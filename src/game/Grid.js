import { Container, Graphics } from 'pixi.js';
import { CONFIG } from '../config.js';
import { Cat } from './Cat.js';

// Класс игрового поля 5x5 (TASK-015: 16px radius, inset depth, glow)
export class Grid extends Container {
  constructor(app) {
    super();
    this.app = app;
    this.slots = new Array(25).fill(null); // null = пусто, Cat = объект котика

    this._drawBackground();
    this._drawCells();
  }

  // Отрисовка подложки сетки
  _drawBackground() {
    const gridWidth = CONFIG.GRID_SIZE * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING;
    const gridHeight = gridWidth;

    const bg = new Graphics();
    bg.roundRect(0, 0, gridWidth, gridHeight, 20);
    bg.fill(CONFIG.COLORS.GRID_BG || 0x15122c);
    bg.stroke({ color: CONFIG.COLORS.CELL_BORDER || 0x3d356c, width: 2.0 });
    this.addChild(bg);
  }

  // Отрисовка 25 ячеек 5х5 с эффектом углубления и радиусом 16px
  _drawCells() {
    for (let i = 0; i < 25; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);

      const x = CONFIG.GRID_PADDING + col * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);
      const y = CONFIG.GRID_PADDING + row * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);

      const cell = new Graphics();
      // Основной уплотнённый тёмный фон ячейки
      cell.roundRect(x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, 16);
      cell.fill(CONFIG.COLORS.CELL_BG || 0x1d193d);

      // Внутренняя стягивающая тень (эффект углубления)
      cell.roundRect(x + 1, y + 1, CONFIG.CELL_SIZE - 2, CONFIG.CELL_SIZE - 2, 15);
      cell.stroke({ color: 0x090616, alpha: 0.7, width: 1.5 });

      // Верхний светлый блик окантовки
      cell.roundRect(x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, 16);
      cell.stroke({ color: 0xffffff, alpha: 0.12, width: 1.5 });

      this.addChild(cell);
    }
  }

  // Получить котика в указанном слоте
  getCatAtSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 25) return null;
    return this.slots[slotIndex] || null;
  }

  // Получить позицию для котика внутри слота
  getSlotPosition(slotIndex) {
    const col = slotIndex % 5;
    const row = Math.floor(slotIndex / 5);

    const cellX = CONFIG.GRID_PADDING + col * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);
    const cellY = CONFIG.GRID_PADDING + row * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);

    return {
      x: cellX + 1,
      y: cellY + 1
    };
  }

  // TASK-011: Проверяет, есть ли у котика в смежных ячейках котик ТОГО ЖЕ уровня
  hasAdjacentMatchingCat(slotIndex) {
    const cat = this.getCatAtSlot(slotIndex);
    if (!cat) return false;

    const col = slotIndex % 5;
    const row = Math.floor(slotIndex / 5);

    const neighbors = [
      col > 0 ? this.getCatAtSlot(slotIndex - 1) : null, // Влево
      col < 4 ? this.getCatAtSlot(slotIndex + 1) : null, // Вправо
      row > 0 ? this.getCatAtSlot(slotIndex - 5) : null, // Вверх
      row < 4 ? this.getCatAtSlot(slotIndex + 5) : null, // Вниз
    ];

    return neighbors.some((n) => n !== null && n.level === cat.level);
  }

  // TASK-011: Управление умной подсветкой котиков
  updateBoardGlow(draggingCat = null) {
    for (let i = 0; i < 25; i++) {
      const cat = this.slots[i];
      if (!cat) continue;

      if (draggingCat === null) {
        // Режим покоя
        if (this.hasAdjacentMatchingCat(i)) {
          cat.setGlow(true, 0xffd700); // мягкий золотой свет
        } else {
          cat.setGlow(false);
        }
      } else {
        // Режим Drag (перетаскивание)
        if (cat !== draggingCat && cat.level === draggingCat.level) {
          cat.setGlow(true, 0x00ff88); // яркий изумрудный свет
        } else {
          cat.setGlow(false);
        }
      }
    }
  }

  // Возвращает первый свободный индекс слота или -1
  getFreeSlotIndex() {
    return this.slots.findIndex((slot) => slot === null);
  }

  // Добавить котика в слот
  addCat(cat, slotIndex) {
    if (slotIndex < 0 || slotIndex >= 25) return;

    if (this.slots[slotIndex] && this.slots[slotIndex] !== cat) {
      this.removeCat(slotIndex);
    }

    this.slots[slotIndex] = cat;
    cat.slotIndex = slotIndex;

    const pos = this.getSlotPosition(slotIndex);
    cat.position.set(pos.x, pos.y);

    if (cat.parent !== this) {
      this.addChild(cat);
    }

    this.updateBoardGlow();
  }

  // Удалить котика из слота
  removeCat(slotIndex) {
    if (this.slots[slotIndex]) {
      const cat = this.slots[slotIndex];
      cat.setGlow(false);
      if (cat.parent === this) {
        this.removeChild(cat);
      }
      this.slots[slotIndex] = null;
    }
    this.updateBoardGlow();
  }

  // Экспорт состояния слотов
  exportState() {
    const state = [];
    for (let i = 0; i < 25; i++) {
      if (this.slots[i] !== null) {
        state.push({
          slotIndex: i,
          catLevel: this.slots[i].level
        });
      }
    }
    return state;
  }

  // Импорт состояния
  importState(gridStateArr) {
    for (let i = 0; i < 25; i++) {
      this.removeCat(i);
    }

    if (!gridStateArr) return;

    let items = gridStateArr;
    if (typeof gridStateArr === 'string') {
      try {
        items = JSON.parse(gridStateArr);
      } catch (e) {
        items = [];
      }
    }

    if (Array.isArray(items)) {
      items.forEach((item) => {
        if (item && item.slotIndex >= 0 && item.slotIndex < 25) {
          const cat = new Cat(item.catLevel || 1, item.slotIndex);
          this.addCat(cat, item.slotIndex);
        }
      });
    }

    this.updateBoardGlow();
  }
}

export default Grid;
