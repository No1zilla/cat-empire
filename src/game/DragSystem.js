import { Graphics, Container } from 'pixi.js';
import { CONFIG } from '../config.js';
import { VKService } from '../vk/VKBridge.js';

// Система управления перетаскиванием (Drag-and-Drop) и Тапом (Tap & Move / Tap & Merge)
export class DragSystem {
  constructor(app, grid, mergeEngine, onStateChange) {
    this.app = app;
    this.grid = grid;
    this.mergeEngine = mergeEngine;
    this.onStateChange = onStateChange || (() => {});
    this.dragging = null; // { cat, originalSlot, offset }
    this.selectedSlot = null; // Выбранный с помощью Тапа котик
    this._selectionRing = null;
    this.vkService = new VKService();

    this._pointerStart = { x: 0, y: 0 };
    this._hasMoved = false;

    this._setupGlobalListeners();
    this._setupGridTapListener();
  }

  // Создание рамки выделения выбранного тапом котика
  _createSelectionRing() {
    if (!this._selectionRing) {
      this._selectionRing = new Graphics();
    }
  }

  // Выделить слот с помощью тапа
  selectSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 25) return;
    const cat = this.grid.getCatAtSlot(slotIndex);
    if (!cat) return;

    this.clearSelection();
    this.selectedSlot = slotIndex;

    this._createSelectionRing();
    this._selectionRing.clear();

    const cellSize = CONFIG.CELL_SIZE;
    this._selectionRing.roundRect(-4, -4, cellSize + 8, cellSize + 8, 18);
    this._selectionRing.stroke({ color: 0x00ff88, width: 3.5, alpha: 0.95 });

    cat.addChild(this._selectionRing);
    this.vkService.triggerHaptic('light');
  }

  // Снять выделение
  clearSelection() {
    if (this._selectionRing && this._selectionRing.parent) {
      this._selectionRing.parent.removeChild(this._selectionRing);
    }
    this.selectedSlot = null;
  }

  // Настройка слушателя тапов по пустой сетке для перемещения
  _setupGridTapListener() {
    this.grid.eventMode = 'static';
    this.grid.on('pointerdown', (event) => {
      if (this.selectedSlot === null) return;

      // Рассчитываем, по какому слоту кликнули
      const gridGlobal = this.grid.toGlobal({ x: 0, y: 0 });
      const localX = event.global.x - gridGlobal.x;
      const localY = event.global.y - gridGlobal.y;

      const cellStep = CONFIG.CELL_SIZE + CONFIG.GRID_PADDING;
      const col = Math.floor((localX - CONFIG.GRID_PADDING / 2) / cellStep);
      const row = Math.floor((localY - CONFIG.GRID_PADDING / 2) / cellStep);

      if (col >= 0 && col < 5 && row >= 0 && row < 5) {
        const targetSlot = row * 5 + col;
        if (targetSlot !== this.selectedSlot && this.grid.slots[targetSlot] === null) {
          // Перемещение выбранного тапом котика в пустой слот!
          const cat = this.grid.slots[this.selectedSlot];
          if (cat) {
            this.grid.slots[this.selectedSlot] = null;
            this.grid.addCat(cat, targetSlot);
            this.makeDraggable(cat);
            this.clearSelection();
            if (typeof this.onStateChange === 'function') {
              this.onStateChange();
            }
          }
        }
      }
    });
  }

  // Настройка глобальных слушателей событий мыши / касаний
  _setupGlobalListeners() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Движение пальца/мыши по сцене
    this.app.stage.on('pointermove', (event) => {
      if (this.dragging && this.dragging.cat) {
        const dx = event.global.x - this._pointerStart.x;
        const dy = event.global.y - this._pointerStart.y;
        if (dx * dx + dy * dy > 36) {
          this._hasMoved = true;
          this.clearSelection(); // При сдвиге снимаем выделение
        }

        if (this._hasMoved) {
          const cat = this.dragging.cat;
          const gridGlobal = this.grid.toGlobal({ x: 0, y: 0 });
          const localX = event.global.x - gridGlobal.x - this.dragging.offset.x;
          const localY = event.global.y - gridGlobal.y - this.dragging.offset.y;

          cat.position.set(localX, localY);
        }
      }
    });

    // Отпускание пальца/мыши
    this.app.stage.on('pointerup', () => this._drop());
    this.app.stage.on('pointerupoutside', () => this._drop());
  }

  // Сделать котика перетаскиваемым и кликабельным
  makeDraggable(cat) {
    if (!cat) return;

    cat.eventMode = 'static';
    cat.cursor = 'pointer';

    cat.removeAllListeners('pointerdown');

    cat.on('pointerdown', (event) => {
      if (this.dragging) return;

      event.stopPropagation();

      const originalSlot = cat.slotIndex;
      const catGlobal = cat.toGlobal({ x: 0, y: 0 });
      const offsetX = event.global.x - catGlobal.x;
      const offsetY = event.global.y - catGlobal.y;

      this._pointerStart = { x: event.global.x, y: event.global.y };
      this._hasMoved = false;

      this.dragging = {
        cat,
        originalSlot,
        offset: { x: offsetX, y: offsetY }
      };

      this.grid.addChild(cat);
      this.grid.slots[originalSlot] = null;

      cat.alpha = 0.88;
      cat.cursor = 'grabbing';

      this.grid.updateBoardGlow(cat);
    });
  }

  // Логика броска (Drop) или Тапа (Tap)
  _drop() {
    if (!this.dragging) return;

    const { cat, originalSlot } = this.dragging;
    cat.alpha = 1.0;
    cat.cursor = 'pointer';

    // 1. Если это был чистый ТАП (палец не сдвигался)
    if (!this._hasMoved) {
      this._returnCatToSlot(cat, originalSlot);
      this.dragging = null;
      this.grid.updateBoardGlow();

      this._handleTapOnSlot(originalSlot);
      return;
    }

    // 2. Если это было ДВИЖЕНИЕ (Drag-and-Drop)
    const cardWidth = CONFIG.CELL_SIZE - 10;
    const cardHeight = CONFIG.CELL_SIZE - 10;
    const centerX = cat.x + cardWidth / 2;
    const centerY = cat.y + cardHeight / 2;

    const cellStep = CONFIG.CELL_SIZE + CONFIG.GRID_PADDING;
    const col = Math.floor((centerX - CONFIG.GRID_PADDING / 2) / cellStep);
    const row = Math.floor((centerY - CONFIG.GRID_PADDING / 2) / cellStep);

    let targetSlot = -1;
    if (col >= 0 && col < CONFIG.GRID_SIZE && row >= 0 && row < CONFIG.GRID_SIZE) {
      targetSlot = row * CONFIG.GRID_SIZE + col;
    }

    let stateChanged = false;

    if (targetSlot === -1 || targetSlot === originalSlot) {
      this._returnCatToSlot(cat, originalSlot);
    } else if (this.grid.slots[targetSlot] === null) {
      this.grid.addCat(cat, targetSlot);
      stateChanged = true;
    } else {
      const targetCat = this.grid.slots[targetSlot];

      if (targetCat.level === cat.level && cat.level < CONFIG.MAX_CAT_LEVEL) {
        this.grid.slots[originalSlot] = cat;

        const newCat = this.mergeEngine.merge(originalSlot, targetSlot);
        if (newCat) {
          this.makeDraggable(newCat);
          this._playMergeEffect(targetSlot, newCat);
          stateChanged = true;
          this.vkService.triggerHaptic('medium');
        } else {
          this._returnCatToSlot(cat, originalSlot);
        }
      } else {
        this._returnCatToSlot(cat, originalSlot);
      }
    }

    this.dragging = null;
    this.grid.updateBoardGlow();

    if (stateChanged && typeof this.onStateChange === 'function') {
      this.onStateChange();
    }
  }

  // Обработка Тапа по слоту с котиком (Tap to Select / Tap to Merge)
  _handleTapOnSlot(slotIndex) {
    if (this.selectedSlot === null) {
      // Клик по первому котику -> выделить
      this.selectSlot(slotIndex);
    } else if (this.selectedSlot === slotIndex) {
      // Повторный клик по тому же котику -> снять выделение
      this.clearSelection();
    } else {
      // Клик по второму котику при активном выделении
      const prevCat = this.grid.getCatAtSlot(this.selectedSlot);
      const targetCat = this.grid.getCatAtSlot(slotIndex);

      if (prevCat && targetCat && prevCat.level === targetCat.level && prevCat.level < CONFIG.MAX_CAT_LEVEL) {
        // Объединить котиков с помощью Тапа!
        const prevSlot = this.selectedSlot;
        this.clearSelection();

        const newCat = this.mergeEngine.merge(prevSlot, slotIndex);
        if (newCat) {
          this.makeDraggable(newCat);
          this._playMergeEffect(slotIndex, newCat);
          this.vkService.triggerHaptic('medium');
          if (typeof this.onStateChange === 'function') {
            this.onStateChange();
          }
        }
      } else {
        // Уровни разные -> переключить выделение на новый слот
        this.selectSlot(slotIndex);
      }
    }
  }

  // Возврат котика в исходный слот
  _returnCatToSlot(cat, slotIndex) {
    this.grid.addCat(cat, slotIndex);
  }

  // Вспышка, Particle Burst (всплеск искр) и анимация при merge
  _playMergeEffect(slotIndex, newCat) {
    const pos = this.grid.getSlotPosition(slotIndex);
    const cardSize = CONFIG.CELL_SIZE - 2;
    const centerX = pos.x + cardSize / 2;
    const centerY = pos.y + cardSize / 2;

    const flash = new Graphics();
    flash.circle(centerX, centerY, cardSize / 2 + 10);
    flash.fill({ color: 0xffffff, alpha: 0.9 });
    this.grid.addChild(flash);

    const startTime = Date.now();
    const flashDuration = 250;

    const animateFlash = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < flashDuration) {
        flash.alpha = 0.9 * (1 - elapsed / flashDuration);
        requestAnimationFrame(animateFlash);
      } else {
        if (flash.parent) flash.parent.removeChild(flash);
        flash.destroy();
      }
    };
    requestAnimationFrame(animateFlash);

    const particleContainer = new Container();
    this.grid.addChild(particleContainer);

    const particleCount = 18;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const p = new Graphics();
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 3.5 + 2.0;

      if (i % 2 === 0) {
        p.star(0, 0, 4, 6, 3);
        p.fill({ color: 0xffd700, alpha: 0.9 });
      } else {
        p.circle(0, 0, 3);
        p.fill({ color: 0x00f2fe, alpha: 0.9 });
      }

      p.position.set(centerX, centerY);

      particles.push({
        graphic: p,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        scale: 1.0
      });

      particleContainer.addChild(p);
    }

    const pStartTime = performance.now();
    const pDuration = 450;

    const animateParticles = () => {
      const pElapsed = performance.now() - pStartTime;
      const progress = pElapsed / pDuration;

      if (progress < 1.0) {
        particles.forEach((pd) => {
          pd.graphic.x += pd.vx;
          pd.graphic.y += pd.vy;
          pd.graphic.alpha = 1.0 - progress;
          pd.graphic.scale.set(1.0 - progress * 0.5);
        });
        requestAnimationFrame(animateParticles);
      } else {
        if (particleContainer.parent) particleContainer.parent.removeChild(particleContainer);
        particleContainer.destroy({ children: true });
      }
    };
    requestAnimationFrame(animateParticles);

    if (newCat) {
      newCat.scale.set(0.8);
      const startScaleTime = Date.now();
      const animateScale = () => {
        const elapsed = Date.now() - startScaleTime;
        if (elapsed < 150) {
          const progress = elapsed / 150;
          newCat.scale.set(0.8 + progress * 0.4);
          requestAnimationFrame(animateScale);
        } else if (elapsed < 250) {
          const progress = (elapsed - 150) / 100;
          newCat.scale.set(1.2 - progress * 0.2);
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
