import { Container, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { BALANCE } from '../config/balance.js';
import { Grid } from './Grid.js';
import { Cat } from './Cat.js';
import { SpawnSystem } from './SpawnSystem.js';
import { MergeEngine } from './MergeEngine.js';
import { DragSystem } from './DragSystem.js';
import { Economy } from './Economy.js';
import { HUD } from '../ui/HUD.js';
import { Tutorial } from '../ui/Tutorial.js';
import { NewCatModal } from '../ui/NewCatModal.js';
import { CollectionModal } from '../ui/CollectionModal.js';
import { CatDetailModal } from '../ui/CatDetailModal.js';
import { storageService } from '../services/StorageService.js';
import { syncManager } from '../services/SyncManager.js';
import { CatDeck } from '../ui/CatDeck.js';
import { AutoMergeSystem } from './AutoMergeSystem.js';
import { AutoMergeButton } from '../ui/AutoMergeButton.js';
import { FillAllButton } from '../ui/FillAllButton.js';
import { MainMenu } from '../ui/MainMenu.js';
import { OfflineEarningsModal } from '../ui/OfflineEarningsModal.js';
import { SettingsModal } from '../ui/SettingsModal.js';
// TASK-042: все сохранения через storageService (VK Storage + DB + localStorage)

// Главный класс игры (3 яркие сочные кнопки + 📖 Котопедия + Главное Меню п. 4.2.10)
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
      const screenW = this.app.renderer ? this.app.renderer.width : (this.app.screen ? this.app.screen.width : CONFIG.GAME_WIDTH);
      const gameW = CONFIG.GAME_WIDTH;
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
      modal.zIndex = 999999;
      this.app.stage.addChild(modal);
    };

    const openMenu = () => {
      this.showMainMenu();
    };

    this.hud = new HUD(this.app, openCollection, openMenu);
    this.hud.position.set(0, 0);
    this.hud.zIndex = 100;
    this.gameContainer.addChild(this.hud);

    // 3. Увеличенное сочное игровое поле 5x5 (всцентрировано ровно по CONFIG.GAME_WIDTH)
    this.grid = new Grid(this.app);
    const gridWidth = 5 * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING;
    this.grid.x = Math.max(0, Math.floor((CONFIG.GAME_WIDTH - gridWidth) / 2));
    this.grid.y = 58;
    this.grid.zIndex = 50;
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

    // Синхронизируем максимально объединенный прогресс со всеми хранилищами (VK Storage, LocalStorage, DB) при старте
    this._saveToLocalStorage();

    // 6. Ряд из 3-х кнопок управления:
    const buttonRowY = this.grid.y + gridWidth + 12;

    // A) 🐱 Купить (128px) — клик + Hold-to-buy
    this.spawnSystem = new SpawnSystem(this.app, this.grid, this.economy, (cost) => {
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      this._saveToLocalStorage();
    });

    this.spawnSystem.x = 8;
    this.spawnSystem.y = buttonRowY;
    this.spawnSystem.zIndex = 10;
    this.spawnSystem.updateButtonLabel();
    this.gameContainer.addChild(this.spawnSystem);

    // B) 📦 Заполнить (122px) — выкуп всех свободных слотов за 1 клик
    this.fillAllButton = new FillAllButton(this.app, this.grid, this.economy, async (requestedCount, overrideCost) => {
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

      const isFree = (overrideCost === 0);

      if (isFree) {
        spawnCount = Math.min(freeSlots.length, requestedCount || freeSlots.length);
        actualTotalCost = 0;
      } else {
        for (let i = 0; i < freeSlots.length; i++) {
          const catCost = BALANCE.calculateCatCost(currentBought + i);
          if (this.economy && this.economy.coins >= actualTotalCost + catCost) {
            actualTotalCost += catCost;
            spawnCount++;
          } else {
            break;
          }
        }
      }

      if (spawnCount === 0) {
        if (this.fillAllButton) this.fillAllButton._showWarning('Мало 🪙!');
        return;
      }

      if (this.economy) {
        if (actualTotalCost > 0) {
          this.economy.spend(actualTotalCost);
        }
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
        await storageService.saveProgress(this._getStateSnapshot());
      } catch (e) {
        console.error('Ошибка сохранения после массовой покупки:', e);
      }
    });
    this.fillAllButton.x = 141;
    this.fillAllButton.y = buttonRowY;
    this.fillAllButton.zIndex = 10;
    this.gameContainer.addChild(this.fillAllButton);

    // C) ⚡ Соединить все (128px)
    this.autoMergeButton = new AutoMergeButton(this.app, this.economy, async () => {
      if (this.autoMergeSystem) {
        await this.autoMergeSystem.runAutoMerge();
      }
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      this._saveToLocalStorage();
    });
    this.autoMergeButton.x = 274;
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
    this.catDeck.zIndex = 70;
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
        if (this.spawnSystem) this.spawnSystem._stopHold();
        if (this.catDeck) this.catDeck.updateMaxLevel(this.maxCatLevel);

        const rewardGems = 5;
        if (this.economy) this.economy.addGems(rewardGems);

        const newCatModal = new NewCatModal(this.app, newLevel, rewardGems, async () => {
          this._syncToCloud();
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
      if (this.autoMergeButton) this.autoMergeButton.updateLabel();
      this._syncToCloud();
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
        if (this.autoMergeButton) this.autoMergeButton.updateLabel();
        this._syncToCloud();
      }
    );

    // Сделать все существующие котики на сетке перетаскиваемыми
    this.grid.slots.forEach((cat) => {
      if (cat !== null) this.dragSystem.makeDraggable(cat);
    });

    this._startFloatingIncomePopups();
    this._bindLifecycleFlushes();

    // 9. Модальные окна
    const showTutorialIfNeeded = (force = false) => {
      const tutorialDone = localStorage.getItem('cat_empire_tutorial_done');
      if (!force && (tutorialDone || this.maxCatLevel > 1 || (this.economy && this.economy.totalCatsBought > 0))) {
        localStorage.setItem('cat_empire_tutorial_done', '1');
        return;
      }
      const tutorial = new Tutorial(this.app, () => {
        console.log('✅ Туториал завершён!');
      });
      tutorial.zIndex = 999999;
      this.app.stage.addChild(tutorial);
    };

    window.resetTutorial = () => {
      localStorage.removeItem('cat_empire_tutorial_done');
      showTutorialIfNeeded(true);
      console.log('🔄 Туториал перезапущен!');
    };

    // TASK-058: Расчёт офлайн-дохода по времени отсутствия (до 8 часов, кап 28800 сек)
    const lastTimestamp = parseInt(localStorage.getItem('cat_empire_last_timestamp') || '0', 10);
    const now = Date.now();
    let offlineSeconds = 0;
    if (lastTimestamp > 0 && now > lastTimestamp) {
      offlineSeconds = Math.min(28800, Math.floor((now - lastTimestamp) / 1000));
    }
    localStorage.setItem('cat_empire_last_timestamp', String(now));

    const ips = this.economy ? this.economy.incomePerSecond : 0;
    const baseOfflineCoins = Math.round(offlineSeconds * ips * 0.5); // 50% пассивный доход во время отсутствия
    const offlineMinutes = Math.floor(offlineSeconds / 60);

    this._onMenuPlayCallback = () => {
      if (offlineSeconds >= 60 && baseOfflineCoins >= 10) {
        const modal = new OfflineEarningsModal(
          this.app,
          this.economy,
          baseOfflineCoins,
          offlineMinutes,
          () => {
            console.log(`⏰ Офлайн-доход за ${offlineMinutes} мин забран!`);
            showTutorialIfNeeded();
          }
        );
        modal.zIndex = 99999;
        this.app.stage.addChild(modal);
      } else {
        showTutorialIfNeeded();
      }
    };

    this.showMainMenu();

    this._saveToLocalStorage();

    // 10. Авто-сохранение каждые 30 секунд через storageService (VK Storage + DB + localStorage)
    if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);
    this._autoSaveInterval = setInterval(async () => {
      try {
        await this._syncToCloud();
        console.log('🔄 Авто-сохранение (VK Storage + DB + localStorage) выполнено');
      } catch (e) {
        console.error('Ошибка авто-сохранения:', e);
      }
    }, 30000);
  }

  // TASK-042: Единая точка сохранения во все хранилища
  _getStateSnapshot() {
    return {
      coins: this.economy.coins,
      gems: this.economy.gems,
      totalCatsBought: this.economy.totalCatsBought,
      totalMerges: this.economy.totalMerges,
      maxCatLevel: this.maxCatLevel,
      gridState: this.grid ? this.grid.exportState() : []
    };
  }

  // TASK-042a: Дебаунсированное сохранение через storageService (VK Storage + DB + localStorage)
  _syncToCloud() {
    if (!this.economy) return;
    syncManager.scheduleSave(this._getStateSnapshot(), 800);
  }

  // Обратная совместимость: старый метод
  _saveToLocalStorage() {
    this._syncToCloud();
  }

  // TASK-042b + защита от потери данных при сворачивании
  _bindLifecycleFlushes() {
    const handleVisibility = async () => {
      if (!this.economy) return;

      if (document.hidden) {
        // Сворачивание — немедленный flush во все хранилища
        await syncManager.flushImmediate(this._getStateSnapshot());
      } else {
        // Возврат на вкладку — подтянуть свежие данные из облака
        try {
          const cloudState = await storageService.loadProgress();
          if (cloudState && this.economy) {
            // Принять облачные данные, если они свежее
            const cloudMerges = Number(cloudState.totalMerges) || 0;
            const cloudBought = Number(cloudState.totalCatsBought) || 0;
            const cloudMaxLevel = Number(cloudState.maxCatLevel) || 1;
            const localMerges = this.economy.totalMerges || 0;
            const localBought = this.economy.totalCatsBought || 0;
            const localMaxLevel = this.maxCatLevel || 1;

            const isCloudFresher = cloudMerges > localMerges ||
              (cloudMerges === localMerges && cloudBought > localBought) ||
              cloudMaxLevel > localMaxLevel;

            if (isCloudFresher) {
              this.economy.setBalance(
                cloudState.coins,
                cloudState.gems,
                cloudState.totalCatsBought,
                cloudState.totalMerges
              );
              this.maxCatLevel = cloudState.maxCatLevel || this.maxCatLevel;
              // Не перезаписываем активное игровое поле локальной сессии если игрок в процессе взаимодействия
              const isGridEmpty = this.grid ? this.grid.getActiveCatsCount() === 0 : true;
              if (cloudState.gridState && this.grid && isGridEmpty) {
                this.grid.importState(cloudState.gridState);
                this.grid.slots.forEach((cat) => {
                  if (cat !== null && this.dragSystem) this.dragSystem.makeDraggable(cat);
                });
              }
              if (this.catDeck) this.catDeck.updateMaxLevel(this.maxCatLevel);
              if (this.hud) this.hud.update(this.economy.coins, this.economy.gems, this.economy.incomePerSecond);
              console.log('☁️ Прогресс синхронизирован из облака!');
            }
          }
        } catch (e) {
          console.warn('Ошибка синхронизации при возврате:', e);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', () => {
      if (this.economy) syncManager.flushImmediate(this._getStateSnapshot());
    });
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

  // TASK-044: Главное стартовое меню (Соответствие правилу 4.2.10 VK Mini Apps)
  showMainMenu() {
    if (this.hud) this.hud.hideMenuOverlay();

    if (this._mainMenuInstance) {
      if (this._mainMenuInstance.parent) {
        this._mainMenuInstance.parent.removeChild(this._mainMenuInstance);
      }
      this._mainMenuInstance.destroy();
      this._mainMenuInstance = null;
    }

    this._mainMenuInstance = new MainMenu(this.app, {
      onPlay: () => {
        if (this._mainMenuInstance) {
          if (this._mainMenuInstance.parent) {
            this._mainMenuInstance.parent.removeChild(this._mainMenuInstance);
          }
          this._mainMenuInstance.destroy();
          this._mainMenuInstance = null;
        }
        if (this.hud) this.hud.showMenuOverlay();
        console.log('▶️ Игра запущена из главного меню!');
        if (this._onMenuPlayCallback) {
          const cb = this._onMenuPlayCallback;
          this._onMenuPlayCallback = null;
          cb();
        }
      },
      onOpenCollection: () => {
        const modal = new CollectionModal(this.app, this.maxCatLevel, () => {});
        modal.zIndex = 999999;
        this.app.stage.addChild(modal);
      },
      onOpenSettings: () => {
        this.showSettingsModal();
      }
    });

    this._mainMenuInstance.zIndex = 999990;
    this.gameContainer.addChild(this._mainMenuInstance);
  }

  showSettingsModal() {
    const modal = new SettingsModal(this.app, () => {});
    modal.zIndex = 999999;
    this.gameContainer.addChild(modal);
  }

  restartTutorial() {
    localStorage.removeItem('cat_empire_tutorial_done');
    if (this.tutorialOverlay && this.tutorialOverlay.parent) {
      this.tutorialOverlay.parent.removeChild(this.tutorialOverlay);
      this.tutorialOverlay.destroy();
      this.tutorialOverlay = null;
    }
    this.tutorialOverlay = new Tutorial(this.app, () => {
      console.log('🎓 Обучение завершено!');
    });
    this.tutorialOverlay.zIndex = 999999;
    this.gameContainer.addChild(this.tutorialOverlay);
  }
}

export default Game;
