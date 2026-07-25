import { Container, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
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
import { CatDeck } from '../ui/CatDeck.js';
import { AutoMergeSystem } from './AutoMergeSystem.js';
import { AutoMergeButton } from '../ui/AutoMergeButton.js';
import { fetchProfile, saveProgress } from '../api/client.js';

// Главный класс игры (TASK-016: Smart Shop integration)
export class Game {
  constructor(app) {
    this.app = app;
    this.grid = null;
    this.hud = null;
    this.economy = null;
    this.spawnSystem = null;
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
    // 1. Загрузка профиля пользователя с сервера
    let startCoins = 100;
    let startGems = 10;
    let startMaxCatLevel = 1;
    let startTotalCatsBought = 0;
    let userGridState = null;

    try {
      const profileData = await fetchProfile();
      if (profileData && profileData.user) {
        if (profileData.user.coins           !== undefined) startCoins = profileData.user.coins;
        if (profileData.user.gems            !== undefined) startGems  = profileData.user.gems;
        if (profileData.user.maxCatLevel     !== undefined) startMaxCatLevel = profileData.user.maxCatLevel;
        if (profileData.user.totalCatsBought !== undefined) startTotalCatsBought = profileData.user.totalCatsBought;
        if (profileData.user.gridState)      userGridState = profileData.user.gridState;
      }
    } catch (error) {
      console.warn('Сервер не доступен или ошибка получения профиля, используются дефолтные данные:', error);
    }

    this.maxCatLevel = startMaxCatLevel;

    // 2. Создание HUD интерфейса с кнопкой 📖 Котопедии
    const openCollection = () => {
      const modal = new CollectionModal(this.app, this.maxCatLevel, () => {
        console.log('Котопедия закрыта');
      });
      this.app.stage.addChild(modal);
    };

    this.hud = new HUD(this.app, openCollection);
    this.hud.position.set(0, 0);
    this.app.stage.addChild(this.hud);

    // 3. Создание и позиционирование игрового поля 5x5
    this.grid = new Grid(this.app);
    const gridWidth = 5 * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING; // ровно 400px!
    this.grid.x = 0;
    this.grid.y = 95; // отступ сверху под HUD

    // 4. Восстановление состояния котиков на сетке
    if (userGridState) {
      this.grid.importState(userGridState);
    } else {
      // Начальное дефолтное состояние: 2 котика 1-го уровня
      this.grid.importState([
        { slotIndex: 0, catLevel: 1 },
        { slotIndex: 1, catLevel: 1 }
      ]);
    }
    this.app.stage.addChild(this.grid);

    // Вычисляем максимальный уровень на сетке при старте
    this.grid.slots.forEach((cat) => {
      if (cat && cat.level > this.maxCatLevel) {
        this.maxCatLevel = cat.level;
      }
    });

    // 5. Создание системы экономики
    this.economy = new Economy(this.grid);
    this.economy.onUpdate = (coins, gems, ips) => {
      if (this.hud) this.hud.update(coins, gems, ips);
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel();
    };
    this.economy.setBalance(startCoins, startGems, startTotalCatsBought);
    this.economy.startTicker();

    // 6. Создание системы спавна и кнопки покупки (230px)
    this.spawnSystem = new SpawnSystem(this.app, this.grid, this.economy, (cost) => {
      console.log('Потрачено:', cost);
    });
    this.spawnSystem.x = 10;
    this.spawnSystem.y = this.grid.y + gridWidth + 12;
    this.spawnSystem.updateButtonLabel(this.maxCatLevel);
    this.app.stage.addChild(this.spawnSystem);

    // TASK-012: Система каскадного авто-слияния и кнопка бустера (140px)
    this.autoMergeButton = new AutoMergeButton(this.app, this.economy, async () => {
      if (this.autoMergeSystem) {
        await this.autoMergeSystem.runAutoMerge();
      }
    });
    this.autoMergeButton.x = 250;
    this.autoMergeButton.y = this.spawnSystem.y;
    this.app.stage.addChild(this.autoMergeButton);

    // 7. Интерактивная колода карт (CatDeck) прямо на главном экране под кнопкой покупки
    this.catDeck = new CatDeck(this.app, this.maxCatLevel, (level, isUnlocked) => {
      if (isUnlocked) {
        openCollection();
      }
    });
    this.catDeck.y = this.spawnSystem.y + 58;
    this.app.stage.addChild(this.catDeck);

    // 8. Создание MergeEngine и DragSystem
    const onMerge = (newLevel, slotIndex) => {
      console.log(`✨ Merge! Новый котик уровня ${newLevel} в слоте ${slotIndex}`);

      // TASK-010 & TASK-016: Если этот уровень открыт ВПЕРВЫЕ -> Wow-экран + гемы + обновление Smart Shop!
      if (newLevel > this.maxCatLevel) {
        this.maxCatLevel = newLevel;
        if (this.catDeck) this.catDeck.updateMaxLevel(this.maxCatLevel);
        if (this.spawnSystem) this.spawnSystem.updateButtonLabel(this.maxCatLevel);

        const rewardGems = 5;
        if (this.economy) this.economy.addGems(rewardGems);

        const newCatModal = new NewCatModal(this.app, newLevel, rewardGems, async () => {
          try {
            await saveProgress({
              coins: this.economy ? this.economy.coins : undefined,
              gems: this.economy ? this.economy.gems : undefined,
              totalCatsBought: this.economy ? this.economy.totalCatsBought : undefined,
              maxCatLevel: this.maxCatLevel,
              gridState: this.grid.exportState()
            });
          } catch (e) {
            console.error('Ошибка сохранения после открытия нового кота:', e);
          }
        });
        this.app.stage.addChild(newCatModal);
      }
    };

    this.mergeEngine = new MergeEngine(this.grid, onMerge);

    const onStateChange = async () => {
      this.economy.recalcAfterMerge();
      if (this.spawnSystem) this.spawnSystem.updateButtonLabel(this.maxCatLevel);
      localStorage.setItem('cat_empire_last_coins', String(this.economy.coins));
      try {
        await saveProgress({
          coins: this.economy.coins,
          gems: this.economy.gems,
          totalCatsBought: this.economy.totalCatsBought,
          maxCatLevel: this.maxCatLevel,
          gridState: this.grid.exportState()
        });
      } catch (e) {
        console.error('Ошибка сохранения после действия:', e);
      }
    };

    this.dragSystem = new DragSystem(this.app, this.grid, this.mergeEngine, onStateChange);
    this.spawnSystem.dragSystem = this.dragSystem;

    // Подключаем DragSystem к AutoMergeSystem для анимаций
    this.autoMergeSystem = new AutoMergeSystem(
      this.app,
      this.grid,
      this.mergeEngine,
      this.dragSystem,
      async (mergesCount) => {
        console.log(`⚡ Авто-Merge выполнил ${mergesCount} слияний!`);
        this.economy.recalcAfterMerge();
        if (this.spawnSystem) this.spawnSystem.updateButtonLabel(this.maxCatLevel);
        localStorage.setItem('cat_empire_last_coins', String(this.economy.coins));
        try {
          await saveProgress({
            coins: this.economy.coins,
            gems: this.economy.gems,
            totalCatsBought: this.economy.totalCatsBought,
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

    // TASK-015B: Всплывающие зелёные циферки дохода (+N) над котиками на доске
    this._startFloatingIncomePopups();

    // 9. Последовательное отображение модальных окон (Сначала Оффлайн-доход -> По закрытию Туториал)
    const showTutorialIfNeeded = () => {
      const tutorialDone = localStorage.getItem('cat_empire_tutorial_done');
      if (!tutorialDone) {
        const tutorial = new Tutorial(this.app, () => {
          console.log('✅ Туториал завершён!');
        });
        this.app.stage.addChild(tutorial);
      }
    };

    const previousCoins = parseFloat(localStorage.getItem('cat_empire_last_coins') || '0');
    const offlineEarned = Math.max(0, startCoins - previousCoins);

    if (previousCoins > 0 && offlineEarned > 1) {
      const modal = new OfflineModal(this.app, offlineEarned, () => {
        console.log('Оффлайн-доход получен:', offlineEarned);
        showTutorialIfNeeded();
      });
      this.app.stage.addChild(modal);
    } else {
      showTutorialIfNeeded();
    }

    localStorage.setItem('cat_empire_last_coins', String(startCoins));

    // 10. Авто-сохранение прогресса каждые 30 секунд
    if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);
    this._autoSaveInterval = setInterval(async () => {
      try {
        localStorage.setItem('cat_empire_last_coins', String(this.economy.coins));
        await saveProgress({
          coins: this.economy.coins,
          gems: this.economy.gems,
          totalCatsBought: this.economy.totalCatsBought,
          maxCatLevel: this.maxCatLevel,
          gridState: this.grid.exportState()
        });
        console.log('🔄 Авто-сохранение баланса и сетки выполнено');
      } catch (e) {
        console.error('Ошибка авто-сохранения:', e);
      }
    }, 30000);
  }

  // TASK-015B: Цикл всплывающего дохода над котиками
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
          popup.position.set(pos.x + 36, pos.y + 12);
          this.grid.addChild(popup);

          const start = performance.now();
          const duration = 750;

          const anim = () => {
            const elapsed = performance.now() - start;
            if (elapsed < duration) {
              const p = elapsed / duration;
              popup.y = (pos.y + 12) - p * 24;
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
