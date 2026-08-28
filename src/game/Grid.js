import { Container, Graphics } from 'pixi.js';
import { CONFIG, SLOT_COUNT } from '../config.js';
import { creamCard, matSlot } from '../utils/PaintedUI.js';
import { Cat } from './Cat.js';

// Класс игрового поля 5x5 (TASK-016: getActiveCatsCount)
export class Grid extends Container {
  constructor(app) {
    super();
    this.app = app;
    this.slots = new Array(SLOT_COUNT).fill(null); // null = пусто, Cat = объект котика

    this._drawBackground();
    this._drawCells();
  }

  // TASK-016: Метод получения количества активных котиков на сетке
  getActiveCatsCount() {
    return this.slots.filter((cat) => cat !== null).length;
  }

  refreshCatArt() {
    this.slots.forEach((cat) => {
      if (cat && typeof cat.refreshArt === 'function') cat.refreshArt();
    });
  }

  // Сочная монолитная подложка игрового поля 5x5
  _drawBackground() {
    const gridWidth = CONFIG.GRID_SIZE * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING;
    const gridHeight = gridWidth;

    // TASK-119: поле — это физический лоток, а не прямоугольник цвета. Приподнятая
    // рама со светом сверху, внутри — утопленные ячейки. Разница в направлении
    // градиента у рамы и ячеек и создаёт ощущение глубины.
    // TASK-121: поле — деревянный ящик с волокном и болтами по углам. Раньше это
    // была плашка со скруглением, то есть форма, неотличимая от любой другой.
    // Рама выступает за сетку на 10px со всех сторон: только так дерево читается
    // как ящик, а не как перемычки между клетками.
    // TASK-123: лоток кремовый с кантом. Деревянный терялся на деревянном полу,
    // а кремовое пятно, наоборот, отделяет игру от комнаты.
    const frame = 10;
    const tray = creamCard(gridWidth + frame * 2, gridHeight + frame * 2, { radius: 22, borderWidth: 4 });
    tray.position.set(-frame, -frame);
    this.addChild(tray);
  }

  // Отрисовка ячеек поля
  _drawCells() {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const col = i % CONFIG.GRID_SIZE;
      const row = Math.floor(i / CONFIG.GRID_SIZE);

      const x = CONFIG.GRID_PADDING + col * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);
      const y = CONFIG.GRID_PADDING + row * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);

      const cell = matSlot(CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, {
        color: CONFIG.COLORS.CELL_BG || 0xf3c9cf
      });
      cell.position.set(x, y);
      this.addChild(cell);
    }
  }

  // Получить котика в указанном слоте
  getCatAtSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return null;
    return this.slots[slotIndex] || null;
  }

  // Получить позицию для котика внутри слота
  getSlotPosition(slotIndex) {
    const col = slotIndex % CONFIG.GRID_SIZE;
    const row = Math.floor(slotIndex / CONFIG.GRID_SIZE);

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

    const col = slotIndex % CONFIG.GRID_SIZE;
    const row = Math.floor(slotIndex / CONFIG.GRID_SIZE);

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
    for (let i = 0; i < SLOT_COUNT; i++) {
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

  getFirstEmptySlot() {
    return this.getFreeSlotIndex();
  }

  // Добавить котика в слот
  addCat(cat, slotIndex) {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;

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
    this.updateMatchingPairHighlights();
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
    this.updateMatchingPairHighlights();
  }

  // Экспорт состояния слотов
  exportState() {
    const state = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
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
    for (let i = 0; i < SLOT_COUNT; i++) {
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
        if (item && item.slotIndex >= 0 && item.slotIndex < SLOT_COUNT) {
          const cat = new Cat(item.catLevel || 1, item.slotIndex);
          this.addCat(cat, item.slotIndex);
        }
      });
    }

    this.updateBoardGlow();
    this.updateMatchingPairHighlights();
  }

  // TASK-025: Пульсирующая подсветка парных котиков одинакового уровня
  updateMatchingPairHighlights() {
    if (!this._pairGlowContainer) {
      this._pairGlowContainer = new Container();
      this.addChildAt(this._pairGlowContainer, 3);
    }
    this._pairGlowContainer.removeChildren();

    const levelCounts = {};
    for (let i = 0; i < SLOT_COUNT; i++) {
      const cat = this.slots[i];
      if (cat && cat.level < CONFIG.MAX_CAT_LEVEL) {
        levelCounts[cat.level] = (levelCounts[cat.level] || 0) + 1;
      }
    }

    const pairLevels = new Set(
      Object.keys(levelCounts)
        .filter((lvl) => levelCounts[lvl] >= 2)
        .map((lvl) => parseInt(lvl, 10))
    );

    if (pairLevels.size === 0) return;

    for (let i = 0; i < SLOT_COUNT; i++) {
      const cat = this.slots[i];
      if (cat && pairLevels.has(cat.level)) {
        const col = i % CONFIG.GRID_SIZE;
        const row = Math.floor(i / CONFIG.GRID_SIZE);
        const cellX = CONFIG.GRID_PADDING + col * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);
        const cellY = CONFIG.GRID_PADDING + row * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING);

        const pairGlow = new Graphics();
        pairGlow.roundRect(cellX - 2, cellY - 2, CONFIG.CELL_SIZE + 4, CONFIG.CELL_SIZE + 4, 18);
        pairGlow.stroke({ color: 0xffd700, alpha: 0.6, width: 2.0 });
        pairGlow.fill({ color: 0xffd700, alpha: 0.12 });
        this._pairGlowContainer.addChild(pairGlow);
      }
    }
  }
}

export default Grid;
