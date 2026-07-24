import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { Cat } from './Cat.js';
import { saveProgress } from '../api/client.js';

// Система спавна и покупки котиков (Крупная кнопка)
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

  // Создание интерактивной крупной кнопки покупки
  _createButton() {
    const btnWidth = 280;
    const btnHeight = 54;

    const bg = new Graphics();
    bg.roundRect(0, 0, btnWidth, btnHeight, 14);
    bg.fill(CONFIG.COLORS.ACCENT);
    bg.stroke({ color: '#ffffff', alpha: 0.4, width: 2 });
    this.addChild(bg);

    const style = new TextStyle({
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.4, blur: 2, distance: 1 }
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
      this.alpha = 0.85;
    });

    this.on('pointerout', () => {
      this.alpha = 1.0;
    });
  }

  _showNotEnoughCoins() {
    if (this._warningText) {
      this.removeChild(this._warningText);
      this._warningText.destroy();
      this._warningText = null;
    }

    const warningStyle = new TextStyle({
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#e94560',
      align: 'center'
    });

    this._warningText = new Text({
      text: 'Мало монет! 🪙',
      style: warningStyle
    });
    this._warningText.anchor.set(0.5, 0.5);
    this._warningText.position.set(140, -20);
    this.addChild(this._warningText);

    setTimeout(() => {
      if (this._warningText) {
        this.removeChild(this._warningText);
        this._warningText.destroy();
        this._warningText = null;
      }
    }, 1000);
  }

  async _spawnCat() {
    const SPAWN_COST = 10;

    const freeSlot = this.grid.getFreeSlotIndex();
    if (freeSlot === -1) {
      console.log('Нет свободных ячеек на игровом поле!');
      return;
    }

    if (this.economy && !this.economy.canAfford(SPAWN_COST)) {
      this._showNotEnoughCoins();
      return;
    }

    if (this.economy) {
      this.economy.spend(SPAWN_COST);
    }

    const cat = new Cat(1, freeSlot);
    cat.scale.set(0);
    this.grid.addCat(cat, freeSlot);
    cat.playJumpAnimation();

    if (this.dragSystem && typeof this.dragSystem.makeDraggable === 'function') {
      this.dragSystem.makeDraggable(cat);
    }

    if (this.economy) {
      this.economy.recalcAfterMerge();
    }

    this._animateBounce(cat);

    if (typeof this.onCoinSpend === 'function') {
      this.onCoinSpend(SPAWN_COST);
    }

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

  _animateBounce(cat) {
    const startTime = Date.now();
    const phase1Duration = 150;
    const phase2Duration = 100;

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
