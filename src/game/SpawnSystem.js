import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { Cat } from './Cat.js';
import { saveProgress } from '../api/client.js';

// Система спавна и покупки котиков (TASK-016: Подсказка "💡 Зажмите для авто")
export class SpawnSystem extends Container {
  constructor(app, grid, economy, onCoinSpend) {
    super();
    this.app = app;
    this.grid = grid;
    this.economy = economy;
    this.onCoinSpend = onCoinSpend || (() => {});
    this.dragSystem = null;
    this._btnText = null;
    this._subText = null;
    this._warningText = null;
    this._breathRaf = null;

    this._holdTimeout = null;
    this._holdInterval = null;

    this._createButton();
    this.updateButtonLabel();
    this._startBreathingAnimation();
  }

  // Обновление ценника на кнопке покупки
  updateButtonLabel() {
    const cost = this.economy ? this.economy.getCatCost() : 10;
    if (this._btnText) {
      this._btnText.text = `🐱 Купить (${cost.toLocaleString('ru-RU')} 🪙)`;
    }
  }

  // Плавное медленное «дыхание» кнопки при наличии монет у игрока
  _startBreathingAnimation() {
    const start = performance.now();
    const tick = () => {
      if (this.destroyed) return;
      const cost = this.economy ? this.economy.getCatCost() : 10;
      const canAfford = this.economy ? this.economy.canAfford(cost) : false;

      if (canAfford) {
        const elapsed = performance.now() - start;
        const pulse = 1.0 + Math.sin(elapsed * 0.0035) * 0.035;
        this.scale.set(pulse);
      } else {
        this.scale.set(1.0);
      }
      this._breathRaf = requestAnimationFrame(tick);
    };
    this._breathRaf = requestAnimationFrame(tick);
  }

  // Создание кнопки покупки (width 145px) с очевидной подсказкой для игрока
  _createButton() {
    const btnWidth = 145;
    const btnHeight = 50;

    // 1. Нижняя тень
    const shadowBg = new Graphics();
    shadowBg.roundRect(0, 4, btnWidth, btnHeight, 14);
    shadowBg.fill(0x9e2a3b);
    this.addChild(shadowBg);

    // 2. Основная градиентная карточка кнопки
    const bg = new Graphics();
    bg.roundRect(0, 0, btnWidth, btnHeight, 14);
    bg.fill(CONFIG.COLORS.ACCENT || 0xff5e62);
    bg.stroke({ color: '#ffffff', alpha: 0.5, width: 2.0 });
    this.addChild(bg);

    // 3. Блик сверху на кнопке
    const shine = new Graphics();
    shine.roundRect(2, 2, btnWidth - 4, 18, 10);
    shine.fill({ color: 0xffffff, alpha: 0.22 });
    this.addChild(shine);

    // 4. Текст на кнопке (Fredoka font)
    const style = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 3, distance: 1 }
    });

    const cost = this.economy ? this.economy.getCatCost() : 10;
    this._btnText = new Text({
      text: `🐱 Купить (${cost.toLocaleString('ru-RU')} 🪙)`,
      style: style
    });
    this._btnText.anchor.set(0.5, 0);
    this._btnText.x = btnWidth / 2;
    this._btnText.y = 6;
    this.addChild(this._btnText);

    // 5. Понятная подсказка для игрока "💡 Зажмите для авто"
    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 9.5,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });
    this._subText = new Text({ text: '💡 Зажмите для авто', style: subStyle });
    this._subText.anchor.set(0.5, 0);
    this._subText.x = btnWidth / 2;
    this._subText.y = 27;
    this.addChild(this._subText);

    // 6. Настройка интерактивности и Hold-to-Buy (авто-спавн при зажатии)
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', () => {
      this._playClickAnim();
      this._spawnCat();
      this._startHold();
    });

    const stopHandler = () => this._stopHold();
    this.on('pointerup', stopHandler);
    this.on('pointerupoutside', stopHandler);
    this.on('pointerout', stopHandler);
    this.on('pointercancel', stopHandler);

    this.on('pointerover', () => {
      this.alpha = 0.92;
    });
  }

  _startHold() {
    this._stopHold();
    this._holdTimeout = setTimeout(() => {
      this._holdInterval = setInterval(() => {
        const freeSlot = this.grid ? this.grid.getFreeSlotIndex() : -1;
        const cost = this.economy ? this.economy.getCatCost() : 10;
        if (freeSlot !== -1 && this.economy && this.economy.canAfford(cost)) {
          this._spawnCat();
        } else {
          this._stopHold();
        }
      }, 90);
    }, 220);
  }

  _stopHold() {
    if (this._holdTimeout) {
      clearTimeout(this._holdTimeout);
      this._holdTimeout = null;
    }
    if (this._holdInterval) {
      clearInterval(this._holdInterval);
      this._holdInterval = null;
    }
  }

  _playClickAnim() {
    this.scale.set(0.94);
    setTimeout(() => {
      if (!this.destroyed) this.scale.set(1.0);
    }, 100);
  }

  _showNotEnoughCoins() {
    if (this._warningText) {
      this.removeChild(this._warningText);
      this._warningText.destroy();
      this._warningText = null;
    }

    const warningStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ff4757',
      align: 'center'
    });

    this._warningText = new Text({
      text: 'Мало монет! 🪙',
      style: warningStyle
    });
    this._warningText.anchor.set(0.5, 0.5);
    this._warningText.position.set(72, -18);
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
    const cost = this.economy ? this.economy.getCatCost() : 10;

    const freeSlot = this.grid.getFreeSlotIndex();
    if (freeSlot === -1) {
      console.log('Нет свободных ячеек на игровом поле!');
      return;
    }

    if (this.economy && !this.economy.canAfford(cost)) {
      this._showNotEnoughCoins();
      return;
    }

    if (this.economy) {
      this.economy.spend(cost);
      this.economy.totalCatsBought++;
      this.economy.totalCatsCreated++;
      this.updateButtonLabel();
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
      this.onCoinSpend(cost);
    }

    try {
      await saveProgress({
        coins: this.economy ? this.economy.coins : undefined,
        gems: this.economy ? this.economy.gems : undefined,
        totalCatsBought: this.economy ? this.economy.totalCatsBought : undefined,
        totalCatsCreated: this.economy ? this.economy.totalCatsCreated : undefined,
        totalMerges: this.economy ? this.economy.totalMerges : undefined,
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

  destroy(options) {
    this._stopHold();
    if (this._breathRaf) {
      cancelAnimationFrame(this._breathRaf);
      this._breathRaf = null;
    }
    super.destroy(options);
  }
}

export default SpawnSystem;
