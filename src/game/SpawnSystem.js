import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import UIIcons from '../utils/UIIcons.js';
import { glossyButton } from '../utils/PaintedUI.js';
import { BALANCE } from '../config/balance.js';
import { Cat } from './Cat.js';
import { UIUtils } from '../utils/UIUtils.js';
import { ACTION_BTN_W, ACTION_BTN_H } from '../ui/actionRowLayout.js';
import { eventTracker } from '../analytics/EventTracker.js';

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

    // TASK-119: тело кнопки собирается из слоёв материала — кант, градиент,
    // верхний блик, нижняя внутренняя тень. Плоская заливка с полоской блика
    // читалась как веб-кнопка, а не как игровая.
    const body = glossyButton(btnWidth, btnHeight, CONFIG.COLORS.ACCENT || 0xff5e62, { radius: 14 });
    this._innerContainer.addChild(body);

    // 4. Единый чёткий текст на кнопке
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 3, distance: 1 }
    });

    // TASK-118: иконка вектором вместо эмодзи в строке.
    this._btnText = new Text({ text: 'Купить', style: titleStyle });
    this._btnText.anchor.set(0.5, 0);
    this._innerContainer.addChild(this._btnText);
    this._btnIcon = UIIcons.paw(15, 0xffffff);
    this._innerContainer.addChild(this._btnIcon);
    UIIcons.centerIconLabel(this._btnIcon, this._btnText, btnWidth / 2, 6);

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
    this.interactiveChildren = false;
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

  pressDown() {
    this._playClickAnim();
    this._spawnCat();
    this._startHold();
  }

  pressUp() {
    this._stopHold();
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
      this._showWarning('Мало монет!');
      eventTracker.trackActionBlocked('no_coins', {
        context: 'buy_cat',
        cost: Number(cost),
        balance: Number(this.economy.coins) || 0
      });
      return;
    }

    const emptySlot = this.grid.getFreeSlotIndex ? this.grid.getFreeSlotIndex() : -1;
    if (emptySlot === -1) {
      this._showWarning('Поле полно!');
      eventTracker.trackActionBlocked('grid_full', { context: 'buy_cat' });
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
    // onCoinSpend уводит состояние в storageService (localStorage + VK Storage + сервер).
    // TASK-106: здесь же стоял прямой вызов saveProgress() в обход storageService —
    // он дублировал это сохранение и шёл мимо всех проверок, поэтому неподтверждённый
    // стартовый снимок всё равно затирал облако. Единственный путь сохранения — через
    // storageService, иначе защиту можно обойти, не заметив.
    this.onCoinSpend(cost);
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
