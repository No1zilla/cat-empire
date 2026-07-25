import { Graphics } from 'pixi.js';
import { CONFIG } from '../config.js';

// Система управления перетаскиванием (Drag-and-Drop) котиков
export class DragSystem {
  constructor(app, grid, mergeEngine, onStateChange) {
    this.app = app;
    this.grid = grid;
    this.mergeEngine = mergeEngine;
    this.onStateChange = onStateChange || (() => {});
    this.dragging = null; // { cat, originalSlot, dragStartGlobal, dragOffset }

    this._setupGlobalListeners();
  }

  // Настройка глобальных слушателей событий мыши / касаний
  _setupGlobalListeners() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Движение пальца/мыши по сцене
    this.app.stage.on('pointermove', (event) => {
      if (this.dragging && this.dragging.cat) {
        const cat = this.dragging.cat;
        // Перевод глобальных координат в локальные относительно Grid
        const gridGlobal = this.grid.toGlobal({ x: 0, y: 0 });
        const localX = event.global.x - gridGlobal.x - this.dragging.offset.x;
        const localY = event.global.y - gridGlobal.y - this.dragging.offset.y;

        cat.position.set(localX, localY);
      }
    });

    // Отпускание пальца/мыши
    this.app.stage.on('pointerup', () => this._drop());
    this.app.stage.on('pointerupoutside', () => this._drop());
  }

  // Сделать котика перетаскиваемым
  makeDraggable(cat) {
    if (!cat) return;

    cat.eventMode = 'static';
    cat.cursor = 'grab';

    // Удаляем предыдущие подписки, если были
    cat.removeAllListeners('pointerdown');

    cat.on('pointerdown', (event) => {
      if (this.dragging) return; // Игнорировать, если уже идет перетаскивание

      event.stopPropagation();

      const originalSlot = cat.slotIndex;
      const catGlobal = cat.toGlobal({ x: 0, y: 0 });
      const offsetX = event.global.x - catGlobal.x;
      const offsetY = event.global.y - catGlobal.y;

      this.dragging = {
        cat,
        originalSlot,
        offset: { x: offsetX, y: offsetY }
      };

      // Переносим котика на самый верхний слой отрисовки в Grid
      this.grid.addChild(cat);

      // Временно очищаем слот на сетке (котик перетаскивается)
      this.grid.slots[originalSlot] = null;

      cat.alpha = 0.85;
      cat.cursor = 'grabbing';

      // TASK-011: Изумрудная подсветка (0x00ff88) всех совпадений при перетаскивании
      this.grid.updateBoardGlow(cat);
    });
  }

  // Логика броска котика (Drop)
  _drop() {
    if (!this.dragging) return;

    const { cat, originalSlot } = this.dragging;
    cat.alpha = 1.0;
    cat.cursor = 'grab';

    // Вычисляем центральные координаты карточки котика для точного определения слота
    const cardWidth = CONFIG.CELL_SIZE - 10;
    const cardHeight = CONFIG.CELL_SIZE - 10;
    const centerX = cat.x + cardWidth / 2;
    const centerY = cat.y + cardHeight / 2;

    // Формула определения столбца и строки слота
    const cellStep = CONFIG.CELL_SIZE + CONFIG.GRID_PADDING;
    const col = Math.floor((centerX - CONFIG.GRID_PADDING / 2) / cellStep);
    const row = Math.floor((centerY - CONFIG.GRID_PADDING / 2) / cellStep);

    let targetSlot = -1;
    if (col >= 0 && col < CONFIG.GRID_SIZE && row >= 0 && row < CONFIG.GRID_SIZE) {
      targetSlot = row * CONFIG.GRID_SIZE + col;
    }

    let stateChanged = false;

    // Сценарий A: Целевой слот за пределами сетки
    if (targetSlot === -1) {
      this._returnCatToSlot(cat, originalSlot);
    }
    // Сценарий C: Бросок в тот же самый исходный слот
    else if (targetSlot === originalSlot) {
      this._returnCatToSlot(cat, originalSlot);
    }
    // Сценарий B: Целевой слот свободен
    else if (this.grid.slots[targetSlot] === null) {
      this.grid.addCat(cat, targetSlot);
      stateChanged = true;
    }
    // Сценарий D/E: Целевой слот занят другим котиком
    else {
      const targetCat = this.grid.slots[targetSlot];

      // Проверяем возможность объединения (Merge)
      if (targetCat.level === cat.level && cat.level < CONFIG.MAX_CAT_LEVEL) {
        // Возвращаем исходного котика в слот перед merge для корректного удаления в MergeEngine
        this.grid.slots[originalSlot] = cat;

        // Выполняем объединение
        const newCat = this.mergeEngine.merge(originalSlot, targetSlot);

        if (newCat) {
          this.makeDraggable(newCat);
          this._playMergeEffect(targetSlot, newCat);
          stateChanged = true;
        } else {
          this._returnCatToSlot(cat, originalSlot);
        }
      } else {
        // Сценарий E: Уровни разные — возвращаем на исходный слот
        this._returnCatToSlot(cat, originalSlot);
      }
    }

    this.dragging = null;

    // TASK-011: Возврат подсветки в режим покоя
    this.grid.updateBoardGlow();

    if (stateChanged && typeof this.onStateChange === 'function') {
      this.onStateChange();
    }
  }

  // Возврат котика в исходный слот
  _returnCatToSlot(cat, slotIndex) {
    this.grid.addCat(cat, slotIndex);
  }

  // Вспышка и анимация увеличения при успешном merge
  _playMergeEffect(slotIndex, newCat) {
    const pos = this.grid.getSlotPosition(slotIndex);
    const cardSize = CONFIG.CELL_SIZE - 10;

    // Белый круг-вспышка
    const flash = new Graphics();
    flash.circle(pos.x + cardSize / 2, pos.y + cardSize / 2, cardSize / 2 + 5);
    flash.fill({ color: 0xffffff, alpha: 0.8 });
    this.grid.addChild(flash);

    // Анимация затухания вспышки (300ms)
    const startTime = Date.now();
    const duration = 300;

    const animateFlash = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        flash.alpha = 0.8 * (1 - elapsed / duration);
        requestAnimationFrame(animateFlash);
      } else {
        this.grid.removeChild(flash);
        flash.destroy();
      }
    };
    requestAnimationFrame(animateFlash);

    // Анимация масштаба нового котика (bounce)
    if (newCat) {
      newCat.scale.set(0.8);
      const startScaleTime = Date.now();
      const animateScale = () => {
        const elapsed = Date.now() - startScaleTime;
        if (elapsed < 150) {
          const progress = elapsed / 150;
          newCat.scale.set(0.8 + progress * 0.4); // 0.8 -> 1.2
          requestAnimationFrame(animateScale);
        } else if (elapsed < 250) {
          const progress = (elapsed - 150) / 100;
          newCat.scale.set(1.2 - progress * 0.2); // 1.2 -> 1.0
          requestAnimationFrame(animateScale);
        } else {
          newCat.scale.set(1.0);
        }
      };
      requestAnimationFrame(animateScale);
    }
  }
}

export default DragSystem;
