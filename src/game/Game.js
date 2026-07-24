import { CONFIG } from '../config.js';
import { Grid } from './Grid.js';
import { Cat } from './Cat.js';
import { SpawnSystem } from './SpawnSystem.js';
import { MergeEngine } from './MergeEngine.js';
import { DragSystem } from './DragSystem.js';
import { Economy } from './Economy.js';
import { HUD } from '../ui/HUD.js';
import { OfflineModal } from '../ui/OfflineModal.js';
import { Tutorial } from '../ui/Tutorial.js';      // TASK-009
import { fetchProfile, saveProgress } from '../api/client.js';

// Главный класс игры
export class Game {
  constructor(app) {
    this.app = app;
    this.grid = null;
    this.hud = null;
    this.economy = null;
    this.spawnSystem = null;
    this.mergeEngine = null;
    this.dragSystem = null;
    this._autoSaveInterval = null;
  }

  // Асинхронный метод инициализации игровой сцены
  async init(userName = 'Тест Игрок') {
    // 1. Загрузка профиля пользователя с сервера
    let startCoins = 100;
    let startGems = 10;
    let userGridState = null;

    try {
      const profileData = await fetchProfile();
      if (profileData && profileData.user) {
        if (profileData.user.coins !== undefined) startCoins = profileData.user.coins;
        if (profileData.user.gems  !== undefined) startGems  = profileData.user.gems;
        if (profileData.user.gridState) userGridState = profileData.user.gridState;
      }
    } catch (error) {
      console.warn('Сервер не доступен или ошибка получения профиля, используются дефолтные данные:', error);
    }

    // 2. Создание HUD интерфейса
    this.hud = new HUD(this.app);
    this.hud.position.set(0, 0);
    this.app.stage.addChild(this.hud);

    // 3. Создание и позиционирование игрового поля 5x5
    this.grid = new Grid(this.app);
    const gridWidth = 5 * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING;
    this.grid.x = (CONFIG.GAME_WIDTH - gridWidth) / 2;
    this.grid.y = 120; // отступ сверху под HUD

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

    // 5. Создание системы экономики
    this.economy = new Economy(this.grid);
    this.economy.onUpdate = (coins, gems, ips) => {
      if (this.hud) this.hud.update(coins, gems, ips);
    };
    this.economy.setBalance(startCoins, startGems);
    this.economy.startTicker();

    // 6. Проверка и отображение оффлайн-дохода (OfflineModal)
    const previousCoins = parseFloat(localStorage.getItem('cat_empire_last_coins') || '0');
    const offlineEarned = Math.max(0, startCoins - previousCoins);

    if (previousCoins > 0 && offlineEarned > 1) {
      const modal = new OfflineModal(this.app, offlineEarned, () => {
        console.log('Оффлайн-доход получен:', offlineEarned);
      });
      this.app.stage.addChild(modal);
    }

    localStorage.setItem('cat_empire_last_coins', String(startCoins));

    // 7. Создание системы спавна и кнопки покупки с привязкой экономики
    this.spawnSystem = new SpawnSystem(this.app, this.grid, this.economy, (cost) => {
      console.log('Потрачено:', cost);
    });

    const buttonWidth = 220;
    this.spawnSystem.x = (CONFIG.GAME_WIDTH - buttonWidth) / 2;
    this.spawnSystem.y = this.grid.y + gridWidth + 25;
    this.app.stage.addChild(this.spawnSystem);

    // 8. Создание MergeEngine и DragSystem
    const onMerge = (newLevel, slotIndex) => {
      console.log(`✨ Merge! Новый котик уровня ${newLevel} в слоте ${slotIndex}`);
    };

    this.mergeEngine = new MergeEngine(this.grid, onMerge);

    const onStateChange = async () => {
      this.economy.recalcAfterMerge();
      localStorage.setItem('cat_empire_last_coins', String(this.economy.coins));
      try {
        await saveProgress({
          coins: this.economy.coins,
          gems: this.economy.gems,
          gridState: this.grid.exportState()
        });
      } catch (e) {
        console.error('Ошибка сохранения после действия:', e);
      }
    };

    this.dragSystem = new DragSystem(this.app, this.grid, this.mergeEngine, onStateChange);
    this.spawnSystem.dragSystem = this.dragSystem;

    // Сделать все существующие котики на сетке перетаскиваемыми
    this.grid.slots.forEach((cat) => {
      if (cat !== null) this.dragSystem.makeDraggable(cat);
    });

    // 9. Авто-сохранение прогресса каждые 30 секунд
    if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);
    this._autoSaveInterval = setInterval(async () => {
      try {
        localStorage.setItem('cat_empire_last_coins', String(this.economy.coins));
        await saveProgress({
          coins: this.economy.coins,
          gems: this.economy.gems,
          gridState: this.grid.exportState()
        });
        console.log('🔄 Авто-сохранение баланса и сетки выполнено');
      } catch (e) {
        console.error('Ошибка авто-сохранения:', e);
      }
    }, 30000);

    // 10. TASK-009: Туториал первого запуска (поверх всего)
    const tutorialDone = localStorage.getItem('cat_empire_tutorial_done');
    if (!tutorialDone) {
      const tutorial = new Tutorial(this.app, () => {
        console.log('✅ Туториал завершён!');
      });
      this.app.stage.addChild(tutorial);
    }
  }
}

export default Game;
