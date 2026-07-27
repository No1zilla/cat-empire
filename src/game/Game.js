import { Container, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getUITexture } from '../utils/catTextures.js';
import { Grid } from './Grid.js';
import { Cat } from './Cat.js';
import { SpawnSystem } from './SpawnSystem.js';
import { MergeEngine } from './MergeEngine.js';
import { DragSystem } from './DragSystem.js';
import { Economy } from './Economy.js';
import { HUD } from '../ui/HUD.js';
import { OfflineModal } from '../ui/OfflineModal.js';
import { Tutorial } from '../ui/Tutorial.js';
import { NewCatModal } from '../ui/NewCatModal.js';
import { CollectionModal } from '../ui/CollectionModal.js';
import { CatDetailModal } from '../ui/CatDetailModal.js';
import { storageService } from '../services/StorageService.js';
import { CatDeck } from '../ui/CatDeck.js';
import { AutoMergeSystem } from './AutoMergeSystem.js';
import { AutoMergeButton } from '../ui/AutoMergeButton.js';
import { FillAllButton } from '../ui/FillAllButton.js';
import { fetchProfile, saveProgress } from '../api/client.js';

// Главный класс игры (3 яркие сочные кнопки + 📖 Котопедия)
export class Game {
  constructor(app) {
    this.app = app;
    this.grid = null;
    this.hud = null;
    this.economy = null;
    this.spawnSystem = null;
    this.fillAllButton = null;
    this.mergeEngine = null;
    this.dragSystem = null;
    this.catDeck = null;
    this.autoMergeSystem = null;
    this.autoMergeButton = null;
    this.maxCatLevel = 1;
    this._autoSaveInterval = null;
    this._floatingInterval = null;
  }

  // Асинхронный метод инициализации игровой сцены
  async init(userName = 'Тест Игрок') {
    // 1. Единый модуль загрузки через StorageService с каскадной конвергенцией
    const progress = await storageService.loadProgress();

    let startCoins           = progress.coins;
    let startGems            = progress.gems;
    let startMaxCatLevel     = progress.maxCatLevel;
    let startTotalCatsBought = progress.totalCatsBought;
    let startTotalMerges     = progress.totalMerges;
    let gridToImport         = progress.gridState;

    this.maxCatLevel = startMaxCatLevel;

    // 1. Единый центральный контейнер игры для 100% идеального центрирования на всех экранах (ПК VK, мобы, планшеты)
    this.gameContainer = new Container();
    this.gameContainer.sortableChildren = true;
    this.app.stage.addChild(this.gameContainer);

    const updateCentering = () => {
      const screenW = this.app.renderer ? this.app.renderer.width : (this.app.screen ? this.app.screen.width : 400);
      const gameW = 400;
      this.gameContainer.x = Math.max(0, Math.floor((screenW - gameW) / 2));
    };
    updateCentering();
    if (this.app.renderer) {
      this.app.renderer.on('resize', updateCentering);
    }

    // 2. Создание HUD интерфейса с кнопкой 📖 Котопедии
    const openCollection = () => {
      const modal = new CollectionModal(this.app, this.maxCatLevel, () => {
        console.log('Котопедия закрыта');
      });
      this.app.stage.addChild(modal);
    };

    this.hud = new HUD(this.app, openCollection);
    this.hud.position.set(0, 0);
    this.gameContainer.addChild(this.hud);

    // 3. Увеличенное сочное игровое поле 5x5 (всцентрировано ровно по 400px)
    this.grid = new Grid(this.app);
    const gridWidth = 5 * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING;
    this.grid.x = Math.floor((400 - gridWidth) / 2);
    this.grid.y = 58;
    this.gameContainer.addChild(this.grid);

    // 4. Восстановление состояния котиков на сетке через StorageService
    if (gridToImport && Array.isArray(gridToImport) && gridToImport.length > 0) {
      this.grid.importState(gridToImport);
    } else {
      this.grid.importState([
        { slotIndex: 0, catLevel: 1 },
        { slotIndex: 1, catLevel: 1 }
      ]);
    }

    // Вычисляем максимальный уровень на сетке при старте
    this.grid.slots.forEach((cat) => {
      if (cat && cat.level > this.maxCatLevel) {
        this.maxCatLevel = cat.level;
      }
    });

    // 5. Экономика
    this.economy = new Economy(this.grid);
    this.economy.onUpdate = (coins, gems, ips) => {
      if (this.hud) this.hud.update(coins, gems, ips);
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
      if (this.fillAllButton) this.fillAllButton.updateLabel();
    };
    this.economy.setBalance(startCoins, startGems, startTotalCatsBought, startTotalMerges);
    this.economy.startTicker();

    // Синхронизируем максимально объединенный прогресс с бэкендом при старте
    this._saveToLocalStorage();
    try {
      saveProgress({
        coins: this.economy.coins,
        gems: this.economy.gems,
        totalCatsBought: this.economy.totalCatsBought,
        totalMerges: this.economy.totalMerges,
        maxCatLevel: this.maxCatLevel,
        gridState: this.grid.exportState()
      });
    } catch {
      // Игнорируем
    }

    // 6. Ряд из 3-х кнопок управления:
    const buttonRowY = this.grid.y + gridWidth + 12;

    // A) 🐱 Купить (122px) — клик + Hold-to-buy
    this.spawnSystem = new SpawnSystem(this.app, this.grid, this.economy, (cost) => {
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      this._saveToLocalStorage();
    });

    this.spawnSystem.x = 10;
    this.spawnSystem.y = buttonRowY;
    this.spawnSystem.zIndex = 10;
    this.spawnSystem.updateButtonLabel();
    this.gameContainer.addChild(this.spawnSystem);

    // B) 📦 Заполнить (122px) — выкуп всех свободных слотов за 1 клик
    this.fillAllButton = new FillAllButton(this.app, this.grid, this.economy, async () => {
      const freeSlots = [];
      for (let i = 0; i < 25; i++) {
        if (this.grid.slots[i] === null) {
          freeSlots.push(i);
        }
      }

      if (freeSlots.length === 0) {
        if (this.fillAllButton) this.fillAllButton._showWarning('Поле полно!');
        return;
      }

      let actualTotalCost = 0;
      let spawnCount = 0;
      const currentBought = this.economy ? this.economy.totalCatsBought : 0;

      for (let i = 0; i < freeSlots.length; i++) {
        const catCost = 10 + (currentBought + i);
        if (this.economy && this.economy.coins >= actualTotalCost + catCost) {
          actualTotalCost += catCost;
          spawnCount++;
        } else {
          break;
        }
      }

      if (spawnCount === 0) {
        if (this.fillAllButton) this.fillAllButton._showWarning('Мало 🪙!');
        return;
      }

      if (this.economy) {
        this.economy.spend(actualTotalCost);
        this.economy.totalCatsBought += spawnCount;
        this.economy.totalCatsCreated += spawnCount;
      }

      for (let i = 0; i < spawnCount; i++) {
        const slot = freeSlots[i];
        const cat = new Cat(1, slot);
        cat.scale.set(0);
        this.grid.addCat(cat, slot);
        cat.playJumpAnimation();

        if (this.dragSystem && typeof this.dragSystem.makeDraggable === 'function') {
          this.dragSystem.makeDraggable(cat);
        }

        this.spawnSystem._animateBounce(cat);
        await new Promise((r) => setTimeout(r, 35));
      }

      if (this.economy) {
        this.economy.recalcAfterMerge();
      }
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
      if (this.fillAllButton) this.fillAllButton.updateLabel();

      this._saveToLocalStorage();

      try {
        await saveProgress({
          coins: this.economy ? this.economy.coins : undefined,
          gems: this.economy ? this.economy.gems : undefined,
          totalCatsBought: this.economy ? this.economy.totalCatsBought : undefined,
          totalCatsCreated: this.economy ? this.economy.totalCatsCreated : undefined,
          totalMerges: this.economy ? this.economy.totalMerges : undefined,
          gridState: this.grid.exportState()
        });
      } catch (e) {
        console.error('Ошибка сохранения после массовой покупки:', e);
      }
    });
    this.fillAllButton.x = 139;
    this.fillAllButton.y = buttonRowY;
    this.fillAllButton.zIndex = 10;
    this.gameContainer.addChild(this.fillAllButton);

    // C) ⚡ Соединить все (122px)
    this.autoMergeButton = new AutoMergeButton(this.app, this.economy, async () => {
      if (this.autoMergeSystem) {
        await this.autoMergeSystem.runAutoMerge();
      }
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      this._saveToLocalStorage();
    });
    this.autoMergeButton.x = 268;
    this.autoMergeButton.y = buttonRowY;
    this.autoMergeButton.zIndex = 10;
    this.gameContainer.addChild(this.autoMergeButton);

    // 7. Панель «📖 Котопедия» прямо на главном экране под кнопками управления
    this.catDeck = new CatDeck(this.app, this.maxCatLevel, (level, isUnlocked) => {
      if (isUnlocked) {
        const detailModal = new CatDetailModal(this.app, level);
        detailModal.zIndex = 99999;
        this.app.stage.addChild(detailModal);
      }
    });
    this.catDeck.y = buttonRowY + 58;
    this.gameContainer.addChild(this.catDeck);

    // 8. Движок Merge и Drag
    const onMerge = (newLevel, slotIndex) => {
      console.log(`✨ Merge! Новый котик уровня ${newLevel} в слоте ${slotIndex}`);
      if (this.economy) {
        this.economy.totalMerges++;
      }
      this._saveToLocalStorage();

      if (newLevel > this.maxCatLevel) {
        this.maxCatLevel = newLevel;
        if (this.catDeck) this.catDeck.updateMaxLevel(this.maxCatLevel);

        const rewardGems = 5;
        if (this.economy) this.economy.addGems(rewardGems);

        const newCatModal = new NewCatModal(this.app, newLevel, rewardGems, async () => {
          this._saveToLocalStorage();
          try {
            await saveProgress({
              coins: this.economy ? this.economy.coins : undefined,
              gems: this.economy ? this.economy.gems : undefined,
              totalCatsBought: this.economy ? this.economy.totalCatsBought : undefined,
              totalCatsCreated: this.economy ? this.economy.totalCatsCreated : undefined,
              totalMerges: this.economy ? this.economy.totalMerges : undefined,
              maxCatLevel: this.maxCatLevel,
              gridState: this.grid.exportState()
            });
          } catch (e) {
            console.error('Ошибка сохранения после открытия нового кота:', e);
          }
        });
        newCatModal.zIndex = 99999;
        this.app.stage.addChild(newCatModal);
      }
    };

    this.mergeEngine = new MergeEngine(this.grid, onMerge);

    const onStateChange = async () => {
      this.economy.recalcAfterMerge();
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      this._saveToLocalStorage();
      try {
        await saveProgress({
          coins: this.economy.coins,
          gems: this.economy.gems,
          totalCatsBought: this.economy.totalCatsBought,
          totalCatsCreated: this.economy.totalCatsCreated,
          totalMerges: this.economy.totalMerges,
          maxCatLevel: this.maxCatLevel,
          gridState: this.grid.exportState()
        });
      } catch (e) {
        console.error('Ошибка сохранения после действия:', e);
      }
    };

    this.dragSystem = new DragSystem(this.app, this.grid, this.mergeEngine, onStateChange);
    this.spawnSystem.dragSystem = this.dragSystem;

    // Подключаем DragSystem к AutoMergeSystem
    this.autoMergeSystem = new AutoMergeSystem(
      this.app,
      this.grid,
      this.mergeEngine,
      this.dragSystem,
      async (mergesCount) => {
        console.log(`⚡ Авто-Merge выполнил ${mergesCount} слияний!`);
        this.economy.recalcAfterMerge();
        if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
        if (this.fillAllButton) this.fillAllButton.updateLabel();
        this._saveToLocalStorage();
        try {
          await saveProgress({
            coins: this.economy.coins,
            gems: this.economy.gems,
            totalCatsBought: this.economy.totalCatsBought,
            totalMerges: this.economy.totalMerges,
            maxCatLevel: this.maxCatLevel,
            gridState: this.grid.exportState()
          });
        } catch (e) {
          console.error('Ошибка сохранения после авто-мерджа:', e);
        }
      }
    );

    // Сделать все существующие котики на сетке перетаскиваемыми
    this.grid.slots.forEach((cat) => {
      if (cat !== null) this.dragSystem.makeDraggable(cat);
    });

    this._startFloatingIncomePopups();

    // 9. Модальные окна
    const showTutorialIfNeeded = (force = false) => {
      const tutorialDone = localStorage.getItem('cat_empire_tutorial_done');
      if (!tutorialDone || force) {
        const tutorial = new Tutorial(this.app, () => {
          console.log('✅ Туториал завершён!');
        });
        tutorial.zIndex = 999999;
        this.app.stage.addChild(tutorial);
      }
    };

    window.resetTutorial = () => {
      localStorage.removeItem('cat_empire_tutorial_done');
      showTutorialIfNeeded(true);
      console.log('🔄 Туториал перезапущен!');
    };

    const previousCoins = parseFloat(localStorage.getItem('cat_empire_last_coins') || '0');
    const offlineEarned = Math.max(0, startCoins - previousCoins);

    if (previousCoins > 0 && offlineEarned > 1) {
      const modal = new OfflineModal(this.app, offlineEarned, () => {
        console.log('Оффлайн-доход получен:', offlineEarned);
        showTutorialIfNeeded();
      });
      modal.zIndex = 99999;
      this.app.stage.addChild(modal);
    } else {
      showTutorialIfNeeded();
    }

    this._saveToLocalStorage();

    // 10. Авто-сохранение каждые 30 секунд
    if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);
    this._autoSaveInterval = setInterval(async () => {
      try {
        this._saveToLocalStorage();
        await saveProgress({
          coins: this.economy.coins,
          gems: this.economy.gems,
          totalCatsBought: this.economy.totalCatsBought,
          totalCatsCreated: this.economy.totalCatsCreated,
          totalMerges: this.economy.totalMerges,
          maxCatLevel: this.maxCatLevel,
          gridState: this.grid.exportState()
        });
        console.log('🔄 Авто-сохранение баланса и статистики выполнено');
      } catch (e) {
        console.error('Ошибка авто-сохранения:', e);
      }
    }, 30000);
  }

  // Сохранение полного локального состояния в localStorage
  _saveToLocalStorage() {
    if (!this.economy) return;
    localStorage.setItem('cat_empire_last_coins', String(this.economy.coins));
    localStorage.setItem('cat_empire_last_gems', String(this.economy.gems));
    localStorage.setItem('cat_empire_last_max_level', String(this.maxCatLevel));
    localStorage.setItem('cat_empire_last_total_bought', String(this.economy.totalCatsBought));
    localStorage.setItem('cat_empire_last_total_merges', String(this.economy.totalMerges));
    if (this.grid) {
      localStorage.setItem('cat_empire_grid_state', JSON.stringify(this.grid.exportState()));
    }
  }

  _startFloatingIncomePopups() {
    if (this._floatingInterval) clearInterval(this._floatingInterval);

    this._floatingInterval = setInterval(() => {
      if (!this.grid || !this.grid.slots) return;

      this.grid.slots.forEach((cat, slotIndex) => {
        if (cat && cat.level) {
          const income = Math.pow(2, cat.level - 1);
          const pos = this.grid.getSlotPosition(slotIndex);

          const popupStyle = new TextStyle({
            fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#2ecc71',
            dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
          });

          const popup = new Text({ text: `+${income}`, style: popupStyle });
          popup.anchor.set(0.5, 0.5);
          popup.position.set(pos.x + 36, pos.y - 2);
          this.grid.addChild(popup);

          const start = performance.now();
          const duration = 750;

          const anim = () => {
            const elapsed = performance.now() - start;
            if (elapsed < duration) {
              const p = elapsed / duration;
              popup.y = (pos.y - 2) - p * 24;
              popup.alpha = 1.0 - p;
              requestAnimationFrame(anim);
            } else {
              if (popup.parent) popup.parent.removeChild(popup);
              popup.destroy();
            }
          };
          requestAnimationFrame(anim);
        }
      });
    }, 1250);
  }
}

export default Game;
