import { Container, Graphics } from 'pixi.js';
import { CONFIG } from '../config.js';
import { Cat } from './Cat.js';

// Класс игрового поля 5x5 (25 слотов)
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
    bg.roundRect(0, 0, gridWidth, gridHeight, 16);
    bg.fill(CONFIG.COLORS.GRID_BG);
    this.addChild(bg);
  }

  // Отрисовка 25 ячеек 5х5
  _drawCells() {
    for (let i = 0; i < 25; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);

      const x = CONFIG.GRID_PADDING + col * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);
      const y = CONFIG.GRID_PADDING + row * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);

      const cell = new Graphics();
      cell.roundRect(x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, 10);
      cell.fill(CONFIG.COLORS.CELL_BG);
      this.addChild(cell);
    }
  }

  // Получить котика в указанном слоте
  getCatAtSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 25) return null;
    return this.slots[slotIndex] || null;
  }

  // Получить позицию для котика внутри слота (с центрированием относительно 70x70 ячейки)
  getSlotPosition(slotIndex) {
    const col = slotIndex % 5;
    const row = Math.floor(slotIndex / 5);

    const cellX = CONFIG.GRID_PADDING + col * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);
    const cellY = CONFIG.GRID_PADDING + row * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);

    // Карточка котика имеет размер CELL_SIZE - 4 (66x66), поэтому отступ 2px
    return {
      x: cellX + 2,
      y: cellY + 2
    };
  }

  // Возвращает первый свободный индекс слота или -1
  getFreeSlotIndex() {
    return this.slots.findIndex((slot) => slot === null);
  }

  // Добавить котика в слот
  addCat(cat, slotIndex) {
    if (slotIndex < 0 || slotIndex >= 25) return;

    // Если в этом слоте уже есть другой объект котика, удаляем его
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
  }

  // Удалить котика из слота
  removeCat(slotIndex) {
    if (this.slots[slotIndex]) {
      const cat = this.slots[slotIndex];
      if (cat.parent === this) {
        this.removeChild(cat);
      }
      this.slots[slotIndex] = null;
    }
  }

  // Экспорт состояния слотов в массив объектов { slotIndex, catLevel }
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

  // Импорт состояния из массива объектов { slotIndex, catLevel }
  importState(gridStateArr) {
    // Очистить все текущие котики
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
  }
}

export default Grid;
