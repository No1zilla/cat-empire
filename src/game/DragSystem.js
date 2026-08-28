import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { CONFIG, SLOT_COUNT } from '../config.js';
import { getPlatform } from '../platform/index.js';

// Система управления перетаскиванием (Drag-and-Drop) и Тапом (Tap to Move / Tap to Merge)
export class DragSystem {
  constructor(app, grid, mergeEngine, onStateChange) {
    this.app = app;
    this.grid = grid;
    this.mergeEngine = mergeEngine;
    this.onStateChange = onStateChange || (() => {});
    this.dragging = null; // { cat, originalSlot, offset }
    this.selectedSlot = null; // Выбранная тапом ячейка
    this._selectionRing = null;
    this.platform = getPlatform();
    this._comboCount = 0;
    this._lastMergeAt = 0;

    this._pointerStart = { x: 0, y: 0 };
    this._hasMoved = false;

    this._setupGlobalListeners();
    this._setupGridTapListener();
  }

  // Создание окантовки выделения для тапов
  _createSelectionRing() {
    if (!this._selectionRing) {
      this._selectionRing = new Graphics();
    }
  }

  // Выделить слот с помощью тапа
  selectSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
    const cat = this.grid.getCatAtSlot(slotIndex);
    if (!cat) {
      this.clearSelection();
      return;
    }

    this.clearSelection();
    this.selectedSlot = slotIndex;

    this._createSelectionRing();
    this._selectionRing.clear();

    const cellSize = CONFIG.CELL_SIZE;
    const pos = this.grid.getSlotPosition(slotIndex);

    this._selectionRing.roundRect(pos.x - 3, pos.y - 3, cellSize + 4, cellSize + 4, 18);
    this._selectionRing.stroke({ color: 0x00ff88, width: 3.5, alpha: 0.95 });

    this.grid.addChild(this._selectionRing);
    this.platform.haptic('light');
  }

  // Снять выделение
  clearSelection() {
    if (this._selectionRing && this._selectionRing.parent) {
      this._selectionRing.parent.removeChild(this._selectionRing);
    }
    this.selectedSlot = null;
  }

  // Настройка слушателя тапов по пустой сетке
  _setupGridTapListener() {
    this.grid.eventMode = 'static';
    this.grid.on('pointerdown', (event) => {
      if (this.selectedSlot === null) return;

      const gridGlobal = this.grid.toGlobal({ x: 0, y: 0 });
      const localX = event.global.x - gridGlobal.x;
      const localY = event.global.y - gridGlobal.y;

      const cellStep = CONFIG.CELL_SIZE + CONFIG.GRID_PADDING;
      const col = Math.floor((localX - CONFIG.GRID_PADDING / 2) / cellStep);
      const row = Math.floor((localY - CONFIG.GRID_PADDING / 2) / cellStep);

      if (col >= 0 && col < 5 && row >= 0 && row < 5) {
        const targetSlot = row * CONFIG.GRID_SIZE + col;
        if (targetSlot !== this.selectedSlot && this.grid.slots[targetSlot] === null) {
          // Перемещение выделенного котика в пустую ячейку
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

  // Настройка глобальных слушателей событий
  _setupGlobalListeners() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointermove', (event) => {
      if (this.dragging && this.dragging.cat) {
        const dx = event.global.x - this._pointerStart.x;
        const dy = event.global.y - this._pointerStart.y;

        // Переходим в режим Drag только если смещение больше 10px
        if (!this._hasMoved && dx * dx + dy * dy > 100) {
          this._hasMoved = true;
          this.clearSelection();

          // Подготовка котика к перетаскиванию
          const cat = this.dragging.cat;
          this.grid.addChild(cat);
          this.grid.slots[this.dragging.originalSlot] = null;
          cat.alpha = 0.88;
          cat.cursor = 'grabbing';
          this.grid.updateBoardGlow(cat);
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

    const endDragHandler = () => this._drop();
    this.app.stage.on('pointerup', endDragHandler);
    this.app.stage.on('pointerupoutside', endDragHandler);
  }

  // Сделать котика интерактивным
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
    });
  }

  // Завершение взаимодействия (Drop при перетаскивании или Tap при тапе)
  _drop() {
    if (!this.dragging) return;

    const { cat, originalSlot } = this.dragging;
    cat.alpha = 1.0;
    cat.cursor = 'pointer';

    // 1. Если это был чистый ТАП (клиент не двигал палец)
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
          this.platform.haptic('medium');
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
      // Тап 1: выкупить/выделить котика
      this.selectSlot(slotIndex);
    } else if (this.selectedSlot === slotIndex) {
      // Повторный тап по тому же котику -> снять выделение
      this.clearSelection();
    } else {
      // Тап 2: попытаться объединить с ранее выбранным котиком
      const prevSlot = this.selectedSlot;
      const prevCat = this.grid.getCatAtSlot(prevSlot);
      const targetCat = this.grid.getCatAtSlot(slotIndex);

      if (prevCat && targetCat && prevCat.level === targetCat.level && prevCat.level < CONFIG.MAX_CAT_LEVEL) {
        this.clearSelection();

        const newCat = this.mergeEngine.merge(prevSlot, slotIndex);
        if (newCat) {
          this.makeDraggable(newCat);
          this._playMergeEffect(slotIndex, newCat);
          this.platform.haptic('medium');
          if (typeof this.onStateChange === 'function') {
            this.onStateChange();
          }
        }
      } else if (targetCat) {
        // Уровни разные -> переключить выбор на нового котика
        this.selectSlot(slotIndex);
      } else {
        this.clearSelection();
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

    const now = Date.now();
    this._comboCount = (now - this._lastMergeAt < 2200) ? (this._comboCount + 1) : 1;
    this._lastMergeAt = now;
    if (newCat) newCat._mergeCombo = this._comboCount;

    if (this._comboCount >= 2) this._showCombo(centerX, centerY);

    // 2. Золотая кольцевая ударная волна (Golden Shockwave Ring)
    const shockwave = new Graphics();
    this.grid.addChild(shockwave);
    const swStart = Date.now();
    const animShockwave = () => {
      const elapsed = Date.now() - swStart;
      if (elapsed < 350) {
        const pct = elapsed / 350;
        shockwave.clear();
        shockwave.circle(centerX, centerY, 20 + pct * 50);
        shockwave.stroke({ color: 0xffd700, width: Math.max(1.0, 3.5 * (1 - pct)), alpha: 0.95 * (1 - pct) });
        requestAnimationFrame(animShockwave);
      } else {
        if (shockwave.parent) shockwave.parent.removeChild(shockwave);
        shockwave.destroy();
      }
    };
    requestAnimationFrame(animShockwave);

    // 3. Белая вспышка
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
      newCat.scale.set(0.92);
      const startScaleTime = Date.now();
      const animateScale = () => {
        const elapsed = Date.now() - startScaleTime;
        if (elapsed < 180) {
          const progress = elapsed / 180;
          newCat.scale.set(0.92 + progress * 0.1);
          requestAnimationFrame(animateScale);
        } else {
          newCat.scale.set(1.0);
        }
      };
      requestAnimationFrame(animateScale);
    }
  }

  _showCombo(x, y) {
    const combo = new Text({
      text: `COMBO x${this._comboCount}!`,
      style: new TextStyle({
        fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#FFD15C',
        dropShadow: { color: '#000000', alpha: 0.7, blur: 3, distance: 1 }
      })
    });
    combo.anchor.set(0.5);
    combo.position.set(x, y - 28);
    this.grid.addChild(combo);

    const start = performance.now();
    const tick = () => {
      const p = (performance.now() - start) / 700;
      if (p < 1 && !combo.destroyed) {
        combo.y = y - 28 - p * 22;
        combo.alpha = 1 - p;
        combo.scale.set(1 + p * 0.25);
        requestAnimationFrame(tick);
      } else if (combo.parent) {
        combo.parent.removeChild(combo);
        combo.destroy();
      }
    };
    requestAnimationFrame(tick);
  }
}

export default DragSystem;
