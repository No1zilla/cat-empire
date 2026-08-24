import { Container, Text, TextStyle } from 'pixi.js';
import { CONFIG, gameContainerOffsetX } from '../config.js';
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
import { quoteFillAll } from './fillAllPurchase.js';
import { ACTION_BTN_H, ACTION_ROW_MARGIN } from '../ui/actionRowLayout.js';
import { ActionRow } from '../ui/ActionRow.js';
import { CAT_DECK_H, catDeckFrame } from '../ui/catDeckLayout.js';
import { whenCatTexturesChange } from '../utils/catTextures.js';
import { isStarterSnapshot } from '../services/StorageService.js';
import { AdModal } from '../ui/AdModal.js';
import { RubyShopModal } from '../ui/RubyShopModal.js';
import { incomeBoosterService } from './IncomeBooster.js';
import { MainMenu } from '../ui/MainMenu.js';
import { OfflineEarningsModal } from '../ui/OfflineEarningsModal.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { DailyRewardsModal } from '../ui/DailyRewardsModal.js';
import { DailyQuestsModal } from '../ui/DailyQuestsModal.js';
import { LeaderboardModal } from '../ui/LeaderboardModal.js';
import { AscensionModal } from '../ui/AscensionModal.js';
import { eventTracker } from '../analytics/EventTracker.js';
import { eventBus } from '../utils/EventBus.js';
import { dailyRewardsService } from './DailyRewards.js';
import { dailyQuestsService } from './DailyQuests.js';
import { soundManager } from '../audio/SoundManager.js';
import { VKService } from '../vk/VKBridge.js';
import { UIUtils } from '../utils/UIUtils.js';
import { INVITE_FALLBACK_GEMS } from '../ui/DesktopRewardModal.js';
import { RUBY_AD_REWARD } from '../config/rubyShop.js';
import { LiveOpsRow } from '../ui/LiveOpsRow.js';
import { WorldFlightOverlay } from '../ui/WorldFlightOverlay.js';
import { StarterTributeModal } from '../ui/StarterTributeModal.js';
import { VassalsModal } from '../ui/VassalsModal.js';
import { empireMeta } from './EmpireMeta.js';
import { shouldRevealMidgameChrome, shouldOfferDailyNow, shouldSkipBootMenu } from './firstSession.js';
import { setCatWorld } from '../utils/catVisuals.js';
import { VK_GROUP_ID } from '../config/vkCommunity.js';
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
  async init(userName = 'Тест Игрок', profile = null) {
    this.userName = userName;
    this.vkProfile = profile && typeof profile === 'object' ? profile : {};
    // 1. Единый модуль загрузки через StorageService с каскадной конвергенцией
    const progress = await Promise.race([
      storageService.loadProgress().catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), 7000))
    ]) || {
      coins: 100,
      gems: 10,
      maxCatLevel: 1,
      totalCatsBought: 0,
      totalMerges: 0,
      gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
    };
    this._cloudSaveOk = Boolean(progress && progress.isReset) || !isStarterSnapshot(progress);

    if (progress && progress.vkId) {
      eventTracker.setUserId(progress.vkId);
    }
    if (typeof __PLATFORM__ !== 'undefined') {
      eventTracker.setPlatform(__PLATFORM__);
    }

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
      const screenW = this.app.screen && Number.isFinite(this.app.screen.width)
        ? this.app.screen.width
        : CONFIG.GAME_WIDTH;
      this.gameContainer.x = gameContainerOffsetX(screenW, CONFIG.GAME_WIDTH);
    };
    updateCentering();
    try {
      if (this.app.renderer && typeof this.app.renderer.on === 'function') {
        this.app.renderer.on('resize', updateCentering);
      }
    } catch (e) {
      console.warn('Pixi resize hook skipped:', e);
    }

    // 2. Создание HUD интерфейса с кнопкой 📖 Котопедии
    const openCollection = () => this.openCollection();

    const openMenu = () => {
      this.showMainMenu();
    };

    this.hud = new HUD(this.app, openCollection, openMenu, {
      onOpenShop: () => this.showRubyShop('hud'),
      onWatchRubyAd: () => this.showRubyAd()
    });
    this.hud.position.set(0, 0);
    this.hud.zIndex = 100;
    this.hud.update(startCoins, startGems, 0);
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
      const wantX2 = incomeBoosterService.isActive() || empireMeta.isEdictActive() ? 2 : 1;
      if (this.economy.incomeMultiplier !== wantX2 || this.economy.mintPercent !== empireMeta.mint) {
        this._applyIncomeBuffs();
      }
      if (this.hud) this.hud.update(coins, gems, ips);
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
      if (this.fillAllButton) this.fillAllButton.updateLabel();
    };
    this.economy.setBalance(startCoins, startGems, startTotalCatsBought, startTotalMerges);
    setCatWorld(empireMeta.worldIndex);
    this._applyIncomeBuffs();
    this.economy.startTicker();

    if (this._cloudSaveOk) this._saveToLocalStorage();

    // 6. Ряд из 3-х кнопок управления:
    const buttonRowY = this.grid.y + gridWidth + 12;
    this._buttonRowY = buttonRowY;

    // A) 🐱 Купить — клик + Hold-to-buy
    this.spawnSystem = new SpawnSystem(this.app, this.grid, this.economy, (cost) => {
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      if (this.economy) {
        eventTracker.trackCatBought(cost, this.economy.totalCatsBought, this.economy.coins);
      }
      eventBus.emit('CAT_SPAWNED', { cost });
      dailyQuestsService.progress('buy', 1);
      this._saveToLocalStorage();
    });
    this.spawnSystem.updateButtonLabel();

    // B) 📦 Заполнить — выкуп свободных слотов за монеты
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

      const currentBought = this.economy ? this.economy.totalCatsBought : 0;
      const quote = quoteFillAll(freeSlots.length, this.economy ? this.economy.coins : 0, currentBought);
      const spawnCount = quote.count;
      const actualTotalCost = quote.cost;

      if (spawnCount === 0 || actualTotalCost <= 0) {
        if (this.fillAllButton) this.fillAllButton._showWarning('Мало монет!');
        eventTracker.trackActionBlocked('no_coins', {
          context: 'fill_all',
          free_slots: freeSlots.length,
          balance: this.economy ? Number(this.economy.coins) || 0 : 0
        });
        return;
      }

      if (this.economy) {
        this.economy.spend(actualTotalCost, 0, { fill: true });
        this.economy.totalCatsBought += spawnCount;
        this.economy.totalCatsCreated += spawnCount;
      }

      for (let i = 0; i < spawnCount; i++) {
        const slot = freeSlots[i];
        const cat = new Cat(BALANCE.getSpawnCatLevel(this.maxCatLevel, this.economy ? this.economy.mintPercent : 0), slot);
        this.grid.addCat(cat, slot);

        if (this.dragSystem && typeof this.dragSystem.makeDraggable === 'function') {
          this.dragSystem.makeDraggable(cat);
        }

        if (this.spawnSystem) {
          this.spawnSystem._animateBounce(cat);
        }
      }

      eventTracker.trackFillAllTriggered(spawnCount, actualTotalCost, freeSlots.length);
      eventBus.emit('CAT_SPAWNED', { count: spawnCount, fill: true });
      dailyQuestsService.progress('buy', spawnCount);

      if (this.economy) {
        this.economy.recalcAfterMerge();
      }
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      if (this.hud && this.economy) this.hud.update(this.economy.coins, this.economy.gems, this.economy.incomePerSecond);

      this._saveToLocalStorage();
      storageService.saveProgress(this._getStateSnapshot()).catch((e) => {
        console.error('Ошибка фонового сохранения после массовой покупки:', e);
      });
    });

    // C) ⚡ Соединить все
    this.autoMergeButton = new AutoMergeButton(this.app, this.economy, async () => {
      let count = 0;
      if (this.autoMergeSystem) {
        count = await this.autoMergeSystem.runAutoMerge();
      }
      eventTracker.trackAutoMergeTriggered(5, count);
      dailyQuestsService.progress('auto_merge', 1);
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      this._saveToLocalStorage();
      return count;
    }, () => {
      this.showRubyShop('auto_merge_no_rubies');
    });

    this.actionRow = new ActionRow({
      buy: this.spawnSystem,
      fill: this.fillAllButton,
      merge: this.autoMergeButton
    });
    this.actionRow.y = buttonRowY;
    this.actionRow.zIndex = 90;
    this.gameContainer.addChild(this.actionRow);

    this.liveOpsRow = new LiveOpsRow(this.app, this.economy, {
      onBuffs: () => this._applyIncomeBuffs(),
      onPortal: () => this.flyToNextWorld(),
      onLayout: () => this._layoutChrome()
    });
    this.liveOpsRow.x = ACTION_ROW_MARGIN;
    this.liveOpsRow.zIndex = 10;
    this.gameContainer.addChild(this.liveOpsRow);

    // 7. Панель «📖 Котопедия» прямо на главном экране под кнопками управления
    this.catDeck = new CatDeck(this.app, this.maxCatLevel, (level, isUnlocked) => {
      if (isUnlocked) {
        const detailModal = new CatDetailModal(this.app, level);
        detailModal.zIndex = 99999;
        this.app.stage.addChild(detailModal);
      }
    });
    this.catDeck.updateMaxLevel(this.maxCatLevel);
    this.catDeck.zIndex = 70;
    this.gameContainer.addChild(this.catDeck);
    this._dailyOfferedThisBoot = false;
    this._bootHooksRan = false;
    this._applyFirstSessionChrome();
    whenCatTexturesChange(() => {
      if (this.grid && typeof this.grid.refreshCatArt === 'function') this.grid.refreshCatArt();
      if (this.catDeck && typeof this.catDeck._draw === 'function') this.catDeck._draw();
    });
    if (this.grid && typeof this.grid.refreshCatArt === 'function') this.grid.refreshCatArt();

    // 8. Движок Merge и Drag
    const onMerge = (newLevel, slotIndex) => {
      console.log(`✨ Merge! Новый котик уровня ${newLevel} в слоте ${slotIndex}`);
      if (this.economy) {
        this.economy.totalMerges++;
      }
      const combo = (this.dragSystem && this.dragSystem._comboCount) || 1;
      eventBus.emit('CATS_MERGED', { level: newLevel, combo });
      dailyQuestsService.progress('merge', 1);
      eventTracker.trackManualMerge(newLevel - 1, newLevel);
      // Один раз за установку: время до первого самостоятельного слияния
      try {
        eventTracker.trackFirstMerge(
          localStorage.getItem('cat_empire_tutorial_outcome') === 'skip'
        );
      } catch (e) {}
      this._saveToLocalStorage();

      if (newLevel > this.maxCatLevel) {
        this.maxCatLevel = newLevel;
        empireMeta.noteBest(empireMeta.worldIndex, this.maxCatLevel);
        eventTracker.trackMaxCatLevelReached(newLevel);
        eventBus.emit('NEW_CAT_UNLOCKED', { level: newLevel });
        if (this.spawnSystem) this.spawnSystem._stopHold();
        if (this.catDeck) this.catDeck.updateMaxLevel(this.maxCatLevel);

        const isGodCat = newLevel >= 15;
        const alreadyAscended = empireMeta.wasGodClaimed(empireMeta.worldIndex);
        const rewardGems = isGodCat && !alreadyAscended ? 50 : 5;
        if (this.economy) this.economy.addGems(rewardGems);

        if (isGodCat && !alreadyAscended) {
          empireMeta.markGodClaimed(empireMeta.worldIndex);
          const ascension = new AscensionModal(this.app, {
            onFly: () => this.flyToNextWorld(),
            onStay: () => {
              empireMeta.setPendingFlight(true);
              if (this.liveOpsRow) this.liveOpsRow._tick();
              this._syncToCloud();
            }
          });
          this.app.stage.addChild(ascension);
        } else {
          const newCatModal = new NewCatModal(this.app, newLevel, rewardGems, async () => {
            this._syncToCloud();
            this._afterCatsUnderstood();
          });
          newCatModal.zIndex = 99999;
          this.app.stage.addChild(newCatModal);
        }
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

    const showTutorialIfNeeded = (force = false) => {
      let tutorialDone = null;
      try {
        tutorialDone = localStorage.getItem('cat_empire_tutorial_done');
      } catch (e) {}
      if (!force && (tutorialDone || this.maxCatLevel > 1 || (this.economy && this.economy.totalCatsBought > 0))) {
        try { localStorage.setItem('cat_empire_tutorial_done', '1'); } catch (e) {}
        return;
      }
      const tutorial = new Tutorial(this.app, () => {
        console.log('✅ Туториал завершён!');
      });
      tutorial.zIndex = 99990;
      this.gameContainer.addChild(tutorial);
    };

    window.resetTutorial = () => {
      try { localStorage.removeItem('cat_empire_tutorial_done'); } catch (e) {}
      showTutorialIfNeeded(true);
      console.log('🔄 Туториал перезапущен!');
    };

    let lastTimestamp = 0;
    try {
      lastTimestamp = parseInt(localStorage.getItem('cat_empire_last_timestamp') || '0', 10);
    } catch (e) {}
    const now = Date.now();
    let offlineSeconds = 0;
    if (lastTimestamp > 0 && now > lastTimestamp) {
      offlineSeconds = Math.min(28800, Math.floor((now - lastTimestamp) / 1000));
    }
    try { localStorage.setItem('cat_empire_last_timestamp', String(now)); } catch (e) {}

    const ips = this.economy ? this.economy.incomePerSecond : 0;
    const baseOfflineCoins = Math.round(offlineSeconds * ips * 0.5);
    const offlineMinutes = Math.floor(offlineSeconds / 60);

    this._runBootHooks = () => {
      if (this._bootHooksRan) return;
      this._bootHooksRan = true;
      if (this.hud) this.hud.showMenuOverlay();

      const chromeRevealed = shouldRevealMidgameChrome({
        maxCatLevel: this.maxCatLevel,
        totalMerges: this.economy ? this.economy.totalMerges : 0
      });

      const afterHooks = () => {
        const isBeginner = (this.maxCatLevel <= 1 && (this.economy ? this.economy.totalMerges : 0) <= 10);
        if (!isBeginner && offlineSeconds >= 60 && baseOfflineCoins >= 10) {
          const modal = new OfflineEarningsModal(
            this.app,
            this.economy,
            baseOfflineCoins,
            offlineMinutes,
            () => {
              console.log(`⏰ Офлайн-доход за ${offlineMinutes} мин забран!`);
              this._syncToCloud();
              showTutorialIfNeeded();
            }
          );
          modal.zIndex = 99999;
          this.app.stage.addChild(modal);
        } else {
          showTutorialIfNeeded();
        }
      };

      if (shouldOfferDailyNow({
        chromeRevealed,
        canClaim: dailyRewardsService.getState().canClaim,
        alreadyOffered: this._dailyOfferedThisBoot
      })) {
        this._dailyOfferedThisBoot = true;
        this.showDailyRewards(afterHooks);
      } else {
        afterHooks();
      }
    };

    this._onMenuPlayCallback = () => this._runBootHooks();
    try {
      if (shouldSkipBootMenu()) this._runBootHooks();
      else this.showMainMenu();
    } catch (e) {
      console.warn('Boot menu/tutorial skipped:', e);
    }

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
    const resetting = typeof localStorage !== 'undefined'
      && localStorage.getItem('cat_empire_is_reset') === '1';
    return {
      coins: this.economy.coins,
      gems: this.economy.gems,
      totalCatsBought: this.economy.totalCatsBought,
      totalMerges: this.economy.totalMerges,
      maxCatLevel: this.maxCatLevel,
      gridState: this.grid ? this.grid.exportState() : [],
      isReset: resetting
    };
  }

  // TASK-042a: Дебаунсированное сохранение через storageService (VK Storage + DB + localStorage)
  _syncToCloud() {
    if (!this.economy) return;
    const snap = this._getStateSnapshot();
    if (!this._cloudSaveOk && isStarterSnapshot(snap)) return;
    this._cloudSaveOk = true;
    syncManager.scheduleSave(snap, 800);
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
        if (!this._cloudSaveOk && isStarterSnapshot(this._getStateSnapshot())) return;
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

            const isResetting = typeof localStorage !== 'undefined'
              && localStorage.getItem('cat_empire_is_reset') === '1';
            if (isResetting) return;

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
      if (!this.economy) return;
      if (!this._cloudSaveOk && isStarterSnapshot(this._getStateSnapshot())) return;
      syncManager.flushImmediate(this._getStateSnapshot());
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
        soundManager.unlock();
        if (this._onMenuPlayCallback) {
          const cb = this._onMenuPlayCallback;
          this._onMenuPlayCallback = null;
          cb();
        }
      },
      onOpenCollection: () => this.openCollection(),
      onOpenSettings: () => {
        this.showSettingsModal();
      },
      onOpenDaily: () => this.showDailyRewards(),
      onOpenQuests: () => this.showDailyQuests(),
      onOpenLeaderboard: () => this.showLeaderboard(),
      onInvite: () => this.inviteFriends(),
      onOpenShop: () => this.showRubyShop('menu'),
      onOpenCourt: () => this.joinCourt(),
      dailyAvailable: dailyRewardsService.getState().canClaim,
      questsClaimable: dailyQuestsService.getState().claimable
    });

    this._mainMenuInstance.zIndex = 999990;
    this.gameContainer.addChild(this._mainMenuInstance);
  }

  showSettingsModal() {
    const modal = new SettingsModal(this.app, () => {});
    modal.zIndex = 999999;
    this.gameContainer.addChild(modal);
  }

  showDailyRewards(onDone) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (typeof onDone === 'function') onDone();
    };
    const modal = new DailyRewardsModal(this.app, this.economy, (reward) => {
      if (reward && reward.catLevel) {
        this._spawnRewardCat(reward.catLevel);
      }
      this._saveToLocalStorage();
    }, finish);
    this.app.stage.addChild(modal);
  }

  showDailyQuests() {
    const modal = new DailyQuestsModal(this.app, this.economy, () => this._saveToLocalStorage());
    this.app.stage.addChild(modal);
  }

  showLeaderboard() {
    let vkId = this.vkProfile && this.vkProfile.id ? String(this.vkProfile.id) : '';
    try {
      vkId = vkId || String(localStorage.getItem('cat_empire_vk_user_id') || '');
    } catch (e) {}
    const modal = new LeaderboardModal(this.app, {
      maxCatLevel: this.maxCatLevel,
      coins: this.economy ? this.economy.coins : 0,
      vkId,
      firstName: (this.vkProfile && this.vkProfile.firstName) || '',
      lastName: (this.vkProfile && this.vkProfile.lastName) || ''
    });
    this.app.stage.addChild(modal);
  }

  _layoutChrome() {
    const y = this._buttonRowY;
    if (y == null) return;
    if (this.actionRow) this.actionRow.y = y;
    const opsY = y + ACTION_BTN_H + 8;
    if (this.liveOpsRow) {
      this.liveOpsRow.x = ACTION_ROW_MARGIN;
      this.liveOpsRow.y = opsY;
    }
    const opsH = this.liveOpsRow && this.liveOpsRow.visibleHeight ? this.liveOpsRow.visibleHeight : 0;
    if (this.catDeck) {
      const frame = catDeckFrame({
        buttonRowY: y,
        actionBtnH: ACTION_BTN_H,
        liveOpsH: opsH,
        gameHeight: CONFIG.GAME_HEIGHT,
        minDeckH: CAT_DECK_H
      });
      this.catDeck.y = frame.y;
      if (typeof this.catDeck.setDeckHeight === 'function') {
        this.catDeck.setDeckHeight(frame.h);
      }
    }
  }

  _applyFirstSessionChrome() {
    [this.fillAllButton, this.autoMergeButton].forEach((btn) => {
      if (!btn) return;
      btn.visible = true;
    });
    if (this.actionRow && typeof this.actionRow.armButtons === 'function') {
      this.actionRow.armButtons();
    }
    this._layoutChrome();
  }

  _afterCatsUnderstood() {
    this._applyFirstSessionChrome();
    if (!shouldOfferDailyNow({
      chromeRevealed: true,
      canClaim: dailyRewardsService.getState().canClaim,
      alreadyOffered: this._dailyOfferedThisBoot
    })) {
      return;
    }
    this._dailyOfferedThisBoot = true;
    this.showDailyRewards();
  }

  showRubyShop(source = 'unknown') {
    const modal = new RubyShopModal(this.app, this.economy, () => {
      this._applyIncomeBuffs();
      this._saveToLocalStorage();
      if (this.liveOpsRow) this.liveOpsRow._tick();
      this._layoutChrome();
    }, source);
    modal.zIndex = 9999999;
    this.app.stage.addChild(modal);
  }

  showStarterTribute() {
    const modal = new StarterTributeModal(this.app, this.economy, () => this._applyIncomeBuffs(), () => this._saveToLocalStorage());
    modal.zIndex = 9999999;
    this.app.stage.addChild(modal);
  }

  openCollection() {
    empireMeta.noteBest(empireMeta.worldIndex, this.maxCatLevel);
    const modal = new CollectionModal(this.app, this.maxCatLevel, () => {
      setCatWorld(empireMeta.worldIndex);
    }, {
      worldIndex: empireMeta.worldIndex,
      bestByWorld: empireMeta.snapshot().bestByWorld,
      worldsCleared: empireMeta.worldsCleared
    });
    modal.zIndex = 999999;
    this.app.stage.addChild(modal);
  }

  _applyIncomeBuffs() {
    if (!this.economy) return;
    const x2 = incomeBoosterService.isActive() || empireMeta.isEdictActive() ? 2 : 1;
    this.economy.setMintPercent(empireMeta.mint);
    this.economy.setIncomeMultiplier(x2);
    if (this.hud) this.hud.update(this.economy.coins, this.economy.gems, this.economy.incomePerSecond);
  }

  flyToNextWorld() {
    const firstFlight = empireMeta.worldsCleared === 0;
    empireMeta.noteBest(empireMeta.worldIndex, this.maxCatLevel);
    const nextIndex = empireMeta.worldIndex + 1;
    const overlay = new WorldFlightOverlay(this.app, nextIndex, () => {
      empireMeta.flyToNextWorld(this.maxCatLevel);
      setCatWorld(empireMeta.worldIndex);
      const spawnLevel = BALANCE.getSpawnCatLevel(1, empireMeta.mint);
      if (this.grid) {
        this.grid.importState([
          { slotIndex: 0, catLevel: spawnLevel },
          { slotIndex: 1, catLevel: spawnLevel }
        ]);
        if (this.dragSystem) {
          this.grid.slots.forEach((cat) => {
            if (cat) this.dragSystem.makeDraggable(cat);
          });
        }
      }
      this.maxCatLevel = spawnLevel;
      if (this.economy) {
        this.economy.setBalance(this.economy.coins, this.economy.gems, 0, this.economy.totalMerges);
        this._applyIncomeBuffs();
      }
      this._applyFirstSessionChrome();
      if (this.catDeck) this.catDeck.updateMaxLevel(this.maxCatLevel);
      if (this.liveOpsRow) this.liveOpsRow._tick();
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
      if (this.fillAllButton) this.fillAllButton.updateLabel();
      this._saveToLocalStorage();
      UIUtils.showToast(this.app.stage, 'Новая территория. Новые котики.');
      if (firstFlight && !empireMeta.snapshot().vassalsSummoned) {
        const vassals = new VassalsModal(this.app, this.economy, () => {
          const vk = new VKService();
          return vk.showInviteBox();
        }, () => this._saveToLocalStorage());
        this.app.stage.addChild(vassals);
      }
    });
    this.app.stage.addChild(overlay);
  }

  async joinCourt() {
    const vk = new VKService();
    if (empireMeta.snapshot().communityJoined) {
      UIUtils.showToast(this.app.stage, 'Ты уже во дворе');
      return;
    }
    const result = await vk.joinGroup(VK_GROUP_ID);
    if (result && result.noGroup) {
      UIUtils.showToast(this.app.stage, 'Двор скоро откроется');
      return;
    }
    if (result && result.success && !result.simulated) {
      this.economy.addGems(5);
      empireMeta.markCommunityJoined();
      eventTracker.track('community_joined', { group_id: VK_GROUP_ID });
      this._saveToLocalStorage();
      UIUtils.showToast(this.app.stage, `Двор принял тебя. +${UIUtils.formatRubies(5)}`);
    } else if (result && result.simulated) {
      UIUtils.showToast(this.app.stage, 'Двор доступен внутри VK');
    } else {
      UIUtils.showToast(this.app.stage, 'Вступление отменено');
    }
  }

  showRubyAd() {
    const stage = this.app.stage;
    stage.sortableChildren = true;
    const modal = new AdModal(this.app, this.economy, () => this._saveToLocalStorage(), RUBY_AD_REWARD, 'Получение рубинов через:');
    modal.zIndex = 9999999;
    stage.addChild(modal);
  }

  async inviteFriends() {
    const vk = new VKService();
    const result = await vk.showInviteBox();
    if (result && result.success && !result.simulated) {
      if (this.economy) this.economy.addGems(INVITE_FALLBACK_GEMS);
      this._saveToLocalStorage();
      UIUtils.showToast(this.app.stage, `🤝 +${UIUtils.formatRubies(INVITE_FALLBACK_GEMS)} за приглашение друзей!`);
    } else if (result && result.simulated) {
      UIUtils.showToast(this.app.stage, '🤝 Приглашения доступны внутри VK');
    } else {
      UIUtils.showToast(this.app.stage, 'Приглашение отменено');
    }
  }

  _spawnRewardCat(level) {
    if (!this.grid) return false;
    const slot = this.grid.getFreeSlotIndex ? this.grid.getFreeSlotIndex() : -1;
    if (slot < 0) {
      const gems = Math.max(5, Number(level) * 2);
      if (this.economy) this.economy.addGems(gems);
      UIUtils.showToast(this.app.stage, `Поле полно — +${UIUtils.formatRubies(gems)} вместо котика`);
      return false;
    }
    const cat = new Cat(Math.max(1, Number(level) || 1), slot);
    this.grid.addCat(cat, slot);
    if (this.dragSystem && typeof this.dragSystem.makeDraggable === 'function') {
      this.dragSystem.makeDraggable(cat);
    }
    if (this.spawnSystem && typeof this.spawnSystem._animateBounce === 'function') {
      this.spawnSystem._animateBounce(cat);
    }
    if (level > this.maxCatLevel) {
      this.maxCatLevel = level;
      if (this.catDeck) this.catDeck.updateMaxLevel(this.maxCatLevel);
    }
    if (this.economy) this.economy.recalcAfterMerge();
    eventBus.emit('CAT_SPAWNED', { level, reward: true });
    return true;
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
    this.tutorialOverlay.zIndex = 99990;
    this.gameContainer.addChild(this.tutorialOverlay);
  }
}

export default Game;
