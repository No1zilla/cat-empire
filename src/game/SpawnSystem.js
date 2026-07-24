import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { Cat } from './Cat.js';
import { saveProgress } from '../api/client.js';

// Система спавна и покупки котиков
export class SpawnSystem extends Container {
  constructor(app, grid, economy, onCoinSpend) {
    super();
    this.app = app;
    this.grid = grid;
    this.economy = economy;
    this.onCoinSpend = onCoinSpend || (() => {});
    this.dragSystem = null;
    this._warningText = null;

    this._createButton();
  }

  // Создание интерактивной кнопки покупки
  _createButton() {
    const btnWidth = 220;
    const btnHeight = 50;

    const bg = new Graphics();
    bg.roundRect(0, 0, btnWidth, btnHeight, 12);
    bg.fill(CONFIG.COLORS.ACCENT);
    this.addChild(bg);

    const style = new TextStyle({
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });

    const btnText = new Text({
      text: '🐱 Купить котика (10 монет)',
      style: style
    });
    btnText.anchor.set(0.5, 0.5);
    btnText.x = btnWidth / 2;
    btnText.y = btnHeight / 2;
    this.addChild(btnText);

    // Настройка интерактивности кнопки
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', () => {
      this._spawnCat();
    });

    this.on('pointerover', () => {
      this.alpha = 0.8;
    });

    this.on('pointerout', () => {
      this.alpha = 1.0;
    });
  }

  // Показать всплывающее сообщение о нехватке монет
  _showNotEnoughCoins() {
    if (this._warningText) {
      this.removeChild(this._warningText);
      this._warningText.destroy();
      this._warningText = null;
    }

    const warningStyle = new TextStyle({
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#e94560',
      align: 'center'
    });

    this._warningText = new Text({
      text: 'Мало монет! 🪙',
      style: warningStyle
    });
    this._warningText.anchor.set(0.5, 0.5);
    this._warningText.position.set(110, -20);
    this.addChild(this._warningText);

    setTimeout(() => {
      if (this._warningText) {
        this.removeChild(this._warningText);
        this._warningText.destroy();
        this._warningText = null;
      }
    }, 1000);
  }

  // Логика спавна котика в свободный слот
  async _spawnCat() {
    const SPAWN_COST = 10;

    // 1. Проверка доступности слота
    const freeSlot = this.grid.getFreeSlotIndex();
    if (freeSlot === -1) {
      console.log('Нет свободных ячеек на игровом поле!');
      return;
    }

    // 2. Проверка баланса монет
    if (this.economy && !this.economy.canAfford(SPAWN_COST)) {
      this._showNotEnoughCoins();
      return;
    }

    // 3. Списание средств
    if (this.economy) {
      this.economy.spend(SPAWN_COST);
    }

    // 4. Создаём нового котика 1-го уровня
    const cat = new Cat(1, freeSlot);
    cat.scale.set(0);
    this.grid.addCat(cat, freeSlot);
    cat.playJumpAnimation(); // TASK-008: анимация прыжка при спавне

    // 5. Делаем котика перетаскиваемым
    if (this.dragSystem && typeof this.dragSystem.makeDraggable === 'function') {
      this.dragSystem.makeDraggable(cat);
    }

    // 6. Пересчёт дохода после появления нового котика
    if (this.economy) {
      this.economy.recalcAfterMerge();
    }

    // 7. Bounce-анимация появления
    this._animateBounce(cat);

    // 8. Коллбэк траты монет
    if (typeof this.onCoinSpend === 'function') {
      this.onCoinSpend(SPAWN_COST);
    }

    // 9. Авто-сохранение прогресса
    try {
      await saveProgress({
        coins: this.economy ? this.economy.coins : undefined,
        gems: this.economy ? this.economy.gems : undefined,
        gridState: this.grid.exportState()
      });
    } catch (error) {
      console.error('Ошибка автосохранения при спавне:', error);
    }
  }

  // Вспомогательная bounce-анимация появления
  _animateBounce(cat) {
    const startTime = Date.now();
    const phase1Duration = 150; // 0 -> 1.2
    const phase2Duration = 100; // 1.2 -> 1.0

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < phase1Duration) {
        const progress = elapsed / phase1Duration;
        const scale = progress * 1.2;
        cat.scale.set(scale);
        requestAnimationFrame(animate);
      } else if (elapsed < phase1Duration + phase2Duration) {
        const progress = (elapsed - phase1Duration) / phase2Duration;
        const scale = 1.2 - progress * 0.2;
        cat.scale.set(scale);
        requestAnimationFrame(animate);
      } else {
        cat.scale.set(1.0);
      }
    };

    requestAnimationFrame(animate);
  }
}

export default SpawnSystem;
