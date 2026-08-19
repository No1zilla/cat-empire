import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { BALANCE } from '../config/balance.js';
import { Cat } from './Cat.js';
import { saveProgress } from '../api/client.js';
import { UIUtils } from '../utils/UIUtils.js';
import { ACTION_BTN_W, ACTION_BTN_H } from '../ui/actionRow.js';

/**
 * Система спавна и покупки котиков (Чистая сочная 3D кнопка без наслоений текста)
 */
export class SpawnSystem extends Container {
  constructor(app, grid, economy, onCoinSpend) {
    super();
    this.app = app;
    this.grid = grid;
    this.economy = economy;
    this.onCoinSpend = onCoinSpend || (() => {});
    this.dragSystem = null;
    this._btnText = null;
    this._warningText = null;

    this._holdTimeout = null;
    this._holdInterval = null;

    this._createButton();
    this.updateButtonLabel();
  }

  updateButtonLabel() {
    const cost = this.economy ? this.economy.getCatCost() : 10;
    const formattedCost = UIUtils.formatNumber(cost);

    if (this._subText) {
      this._subText.removeChildren();
      this._subText.text = `${formattedCost} `;

      const coinIcon = UIUtils.createCoinIcon(6);
      this._subText.addChild(coinIcon);

      const textWidth = this._subText.width;
      const coinWidth = 12;
      const totalWidth = textWidth + coinWidth;

      this._subText.anchor.set(0, 0.5);
      this._subText.position.set(Math.floor((ACTION_BTN_W - totalWidth) / 2), 33);
      coinIcon.position.set(textWidth + 6, 0);
    }
  }

  // Создание кнопки покупки (одна ширина с Заполнить / Соединить)
  _createButton() {
    const btnWidth = ACTION_BTN_W;
    const btnHeight = ACTION_BTN_H;

    this.removeChildren();

    this._innerContainer = new Container();
    this._innerContainer.pivot.set(btnWidth / 2, btnHeight / 2);
    this._innerContainer.position.set(btnWidth / 2, btnHeight / 2);
    this.addChild(this._innerContainer);

    // 1. Нижняя тень
    const shadowBg = new Graphics();
    shadowBg.roundRect(0, 4, btnWidth, btnHeight, 14);
    shadowBg.fill(0x9e2a3b);
    this._innerContainer.addChild(shadowBg);

    // 2. Основная градиентная карточка кнопки
    const bg = new Graphics();
    bg.roundRect(0, 0, btnWidth, btnHeight, 14);
    bg.fill(CONFIG.COLORS.ACCENT || 0xff5e62);
    bg.stroke({ color: '#ffffff', alpha: 0.7, width: 2.0 });
    this._innerContainer.addChild(bg);

    // 3. Блик сверху на кнопке
    const shine = new Graphics();
    shine.roundRect(2, 2, btnWidth - 4, 18, 10);
    shine.fill({ color: 0xffffff, alpha: 0.22 });
    this._innerContainer.addChild(shine);

    // 4. Единый чёткий текст на кнопке
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 3, distance: 1 }
    });

    this._btnText = new Text({ text: '🐱 Купить', style: titleStyle });
    this._btnText.anchor.set(0.5, 0);
    this._btnText.position.set(btnWidth / 2, 6);
    this._innerContainer.addChild(this._btnText);

    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
    });

    this._subText = new Text({ text: '0', style: subStyle });
    this._subText.anchor.set(0, 0);
    this._subText.position.set(btnWidth / 2, 25);
    this._innerContainer.addChild(this._subText);

    // 5. Настройка интерактивности и Hold-to-Buy
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(0, 0, btnWidth, btnHeight);

    let lastSpawnTapTime = 0;
    const handleSpawnPress = (e) => {
      const now = Date.now();
      if (now - lastSpawnTapTime < 300) return;
      lastSpawnTapTime = now;

      if (e) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.preventDefault === 'function') e.preventDefault();
      }
      this._playClickAnim();
      this._spawnCat();
      this._startHold();
    };

    this.on('pointertap', handleSpawnPress);
    this.on('pointerdown', handleSpawnPress);
    this.on('tap', handleSpawnPress);
    this.on('click', handleSpawnPress);
    this.on('touchstart', handleSpawnPress);

    const stopHandler = () => this._stopHold();
    this._globalStopHandler = stopHandler;

    this.on('pointerup', stopHandler);
    this.on('pointerupoutside', stopHandler);
    this.on('pointerout', () => {
      this.alpha = 1.0;
      stopHandler();
    });
    this.on('pointercancel', stopHandler);
    this.on('touchend', stopHandler);

    window.addEventListener('pointerup', stopHandler);
    window.addEventListener('touchend', stopHandler);
    window.addEventListener('blur', stopHandler);

    this.on('pointerover', () => {
      this.alpha = 0.92;
    });
  }

  _startHold() {
    this._stopHold();
    this._holdTimeout = setTimeout(() => {
      this._holdInterval = setInterval(() => {
        this._spawnCat();
      }, 140);
    }, 280);
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

  destroy(options) {
    if (this._globalStopHandler) {
      window.removeEventListener('pointerup', this._globalStopHandler);
      window.removeEventListener('touchend', this._globalStopHandler);
      window.removeEventListener('blur', this._globalStopHandler);
    }
    this._stopHold();
    super.destroy(options);
  }

  _playClickAnim() {
    this.scale.set(0.94);
    setTimeout(() => {
      if (!this.destroyed) this.scale.set(1.0);
    }, 80);
  }

  _showWarning(text) {
    if (this._warningText) {
      this.removeChild(this._warningText);
      this._warningText.destroy();
      this._warningText = null;
    }

    const style = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#e74c3c', alpha: 0.9, blur: 3 }
    });

    this._warningText = new Text({ text, style });
    this._warningText.anchor.set(0.5, 0.5);
    this._warningText.position.set(ACTION_BTN_W / 2, -15);
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

    if (this.economy && !this.economy.canAfford(cost)) {
      this._showWarning('Мало 🪙!');
      return;
    }

    const emptySlot = this.grid.getFreeSlotIndex ? this.grid.getFreeSlotIndex() : -1;
    if (emptySlot === -1) {
      this._showWarning('Поле полно!');
      return;
    }

    if (this.economy) {
      this.economy.spend(cost);
      this.economy.totalCatsBought++;
      this.economy.totalCatsCreated++;
    }

    const maxCatLvl = (window.game && window.game.maxCatLevel) ? window.game.maxCatLevel : 1;
    const mint = (window.game && window.game.economy && window.game.economy.mintPercent) || 0;
    const spawnLevel = BALANCE.getSpawnCatLevel(maxCatLvl, mint);
    const cat = new Cat(spawnLevel, emptySlot);
    cat.scale.set(0);
    this.grid.addCat(cat, emptySlot);
    cat.playJumpAnimation();

    if (this.dragSystem && typeof this.dragSystem.makeDraggable === 'function') {
      this.dragSystem.makeDraggable(cat);
    }

    this._animateBounce(cat);
    this.updateButtonLabel();
    this.onCoinSpend(cost);

    try {
      await saveProgress({
        coins: this.economy ? this.economy.coins : undefined,
        gems: this.economy ? this.economy.gems : undefined,
        totalCatsBought: this.economy ? this.economy.totalCatsBought : undefined,
        totalCatsCreated: this.economy ? this.economy.totalCatsCreated : undefined,
        totalMerges: this.economy ? this.economy.totalMerges : undefined,
        gridState: this.grid.exportState()
      });
    } catch (err) {
      console.error('Ошибка автосохранения при покупке кота:', err);
    }
  }

  _animateBounce(cat) {
    const start = performance.now();
    const bounce = () => {
      if (cat.destroyed) return;
      const elapsed = performance.now() - start;
      if (elapsed < 150) {
        const p = elapsed / 150;
        cat.scale.set(p * 1.12);
      } else if (elapsed < 250) {
        const p = (elapsed - 150) / 100;
        cat.scale.set(1.12 - p * 0.12);
      } else {
        cat.scale.set(1.0);
        return;
      }
      requestAnimationFrame(bounce);
    };
    requestAnimationFrame(bounce);
  }
}

export default SpawnSystem;
