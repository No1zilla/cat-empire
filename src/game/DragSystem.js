import { Graphics, Container } from 'pixi.js';
import { CONFIG } from '../config.js';
import { VKService } from '../vk/VKBridge.js';

// Система управления перетаскиванием (Drag-and-Drop) котиков (TASK-015B: Particle Burst & Haptics)
export class DragSystem {
  constructor(app, grid, mergeEngine, onStateChange) {
    this.app = app;
    this.grid = grid;
    this.mergeEngine = mergeEngine;
    this.onStateChange = onStateChange || (() => {});
    this.dragging = null; // { cat, originalSlot, dragStartGlobal, dragOffset }
    this.vkService = new VKService();

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
          // TASK-015B: Тактильная отдача при мердже
          this.vkService.triggerHaptic('medium');
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

  // TASK-015B: Вспышка, Particle Burst (всплеск искр) и анимация увелечения при merge
  _playMergeEffect(slotIndex, newCat) {
    const pos = this.grid.getSlotPosition(slotIndex);
    const cardSize = CONFIG.CELL_SIZE - 2;
    const centerX = pos.x + cardSize / 2;
    const centerY = pos.y + cardSize / 2;

    // 1. Белый расширяющийся круг-вспышка
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

    // 2. Particle Burst: Разлетающиеся золотые/бриллиантовые звездочки
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

    // 3. Анимация масштаба нового котика (bounce)
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
