import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { quoteFillAll } from '../game/fillAllPurchase.js';
import { ACTION_BTN_W, ACTION_BTN_H } from './actionRowLayout.js';
import { eventTracker } from '../analytics/EventTracker.js';

/**
 * Объёмная сочная кнопка «📦 Заполнить» (Янтарно-золотой градиент)
 */
export class FillAllButton extends Container {
  constructor(app, grid, economy, onTriggerFillAll) {
    super();
    this.app = app;
    this.grid = grid;
    this.economy = economy;
    this.onTriggerFillAll = onTriggerFillAll || (async () => {});

    this._btnBg = null;
    this._shadowBg = null;
    this._btnText = null;
    this._subContainer = null;
    this._warningText = null;
    this._warningCoin = null;

    this._clickAnimTimeout = null;
    this._warningTimeout = null;

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.interactiveChildren = false;

    this._draw();
  }

  getFillData() {
    if (!this.grid || !this.economy) return { count: 0, cost: 0, fullCost: 0, freeSlotsCount: 0 };
    const freeSlotsCount = this.grid.slots.filter((slot) => slot === null).length;
    return quoteFillAll(freeSlotsCount, this.economy.coins, this.economy.totalCatsBought || 0);
  }

  updateLabel() {
    const { count, cost, fullCost, freeSlotsCount } = this.getFillData();

    if (!this._subContainer) return;
    this._subContainer.removeChildren();

    const btnWidth = ACTION_BTN_W;

    if (this._btnText) {
      this._btnText.text = '📦 Заполнить';
      this._btnText.style.fontSize = 13;
      this._btnText.position.set(btnWidth / 2, 6);
    }
    if (this._btnBg) {
      this._btnBg.fill(0xff9f43);
      this._btnBg.stroke({ color: '#ffffff', alpha: 0.6, width: 2.0 });
    }
    if (this._shadowBg) this._shadowBg.fill(0xb35400);

    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.4, blur: 2, distance: 1 }
    });

    if (freeSlotsCount === 0) {
      const textStyle = new TextStyle({ ...subStyle, fill: '#e5e7eb' });
      const textObj = new Text({ text: 'ЗАПОЛНЕНО', style: textStyle });
      textObj.anchor.set(0.5, 0.5);
      textObj.position.set(0, 0);
      this._subContainer.addChild(textObj);
      this._subContainer.pivot.set(0, 0);
      this._subContainer.position.set(btnWidth / 2, 33);
    } else {
      const shownCount = count > 0 ? count : freeSlotsCount;
      const shownCost = count > 0 ? cost : fullCost;
      const formattedCost = UIUtils.formatNumber(shownCost);
      const text1Obj = new Text({ text: `${shownCount} · ${formattedCost} `, style: subStyle });
      text1Obj.anchor.set(0, 0.5);
      text1Obj.position.set(0, 0);

      const coinRadius = 6;
      const coinIcon = UIUtils.createCoinIcon(coinRadius);
      const gap = 3;
      coinIcon.position.set(text1Obj.width + gap + coinRadius, 0);

      this._subContainer.addChild(text1Obj);
      this._subContainer.addChild(coinIcon);

      const totalWidth = text1Obj.width + gap + (coinRadius * 2);
      this._subContainer.pivot.set(totalWidth / 2, 0);
      this._subContainer.position.set(btnWidth / 2, 33);
    }
  }

  _draw() {
    this.removeChildren();

    const btnWidth = ACTION_BTN_W;
    const btnHeight = ACTION_BTN_H;

    this._innerContainer = new Container();
    this._innerContainer.pivot.set(btnWidth / 2, btnHeight / 2);
    this._innerContainer.position.set(btnWidth / 2, btnHeight / 2);
    this.addChild(this._innerContainer);

    // 1. Сочная 3D тень (Янтарно-оранжевый тёмный подтон)
    this._shadowBg = new Graphics();
    this._shadowBg.roundRect(0, 4, btnWidth, btnHeight, 14);
    this._shadowBg.fill(0xb35400);
    this._innerContainer.addChild(this._shadowBg);

    // 2. Основная яркая янтарно-золотая карточка
    this._btnBg = new Graphics();
    this._btnBg.roundRect(0, 0, btnWidth, btnHeight, 14);
    this._btnBg.fill(0xff9f43);
    this._btnBg.stroke({ color: '#ffffff', alpha: 0.6, width: 2.0 });
    this._innerContainer.addChild(this._btnBg);

    // 3. Блик сверху
    const shine = new Graphics();
    shine.roundRect(2, 2, btnWidth - 4, 18, 10);
    shine.fill({ color: 0xffffff, alpha: 0.28 });
    this._innerContainer.addChild(shine);

    // 4. Текст кнопки "📦 Заполнить"
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 3, distance: 1 }
    });

    this._btnText = new Text({ text: '📦 Заполнить', style: titleStyle });
    this._btnText.anchor.set(0.5, 0);
    this._btnText.position.set(btnWidth / 2, 6);
    this._innerContainer.addChild(this._btnText);

    // 5. Подтекст контейнер
    this._subContainer = new Container();
    this._innerContainer.addChild(this._subContainer);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.interactiveChildren = false;
    this.hitArea = new Rectangle(0, 0, btnWidth, btnHeight);

    let lastFATapTime = 0;
    const triggerFillAllClick = (e) => {
      const now = Date.now();
      if (now - lastFATapTime < 100) return;
      lastFATapTime = now;

      if (e) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.preventDefault === 'function') e.preventDefault();
      }
      this.alpha = 0.92;
      this._playClickAnim();
      this._handleClick();
    };

    this.on('pointertap', triggerFillAllClick);
    this.on('pointerdown', (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    });

    const onPointerRelease = () => {
      this.alpha = 1.0;
      if (!this.destroyed && this._innerContainer) {
        this._innerContainer.scale.set(1.0);
      }
    };

    this.on('pointerup', onPointerRelease);
    this.on('pointerupoutside', onPointerRelease);
    this.on('pointerout', onPointerRelease);
    this.on('pointercancel', onPointerRelease);

    this.on('pointerover', () => { this.alpha = 0.92; });

    this.updateLabel();
  }

  press() {
    this._handleClick();
  }

  _playClickAnim() {
    if (this._innerContainer) this._innerContainer.scale.set(0.90);
    if (this._clickAnimTimeout) clearTimeout(this._clickAnimTimeout);
    this._clickAnimTimeout = setTimeout(() => {
      if (!this.destroyed && this._innerContainer) this._innerContainer.scale.set(1.0);
    }, 100);
  }

  _showWarning(text, showCoin = false) {
    if (this._warningText) {
      this.removeChild(this._warningText);
      this._warningText.destroy();
      this._warningText = null;
    }
    if (this._warningCoin) {
      this.removeChild(this._warningCoin);
      this._warningCoin.destroy();
      this._warningCoin = null;
    }
    if (this._warningTimeout) {
      clearTimeout(this._warningTimeout);
      this._warningTimeout = null;
    }

    const warnStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#e74c3c', alpha: 0.9, blur: 3 }
    });

    this._warningText = new Text({
      text: text,
      style: warnStyle
    });
    this._warningText.anchor.set(0.5, 0.5);
    this._warningText.position.set(ACTION_BTN_W / 2, -18);
    this.addChild(this._warningText);

    if (showCoin) {
      this._warningCoin = UIUtils.createCoinIcon(7, true);
      this._warningCoin.position.set(ACTION_BTN_W / 2 + this._warningText.width / 2 + 6, -18);
      this.addChild(this._warningCoin);
    }

    this._warningTimeout = setTimeout(() => {
      if (this._warningText) {
        this.removeChild(this._warningText);
        this._warningText.destroy();
        this._warningText = null;
      }
      if (this._warningCoin) {
        this.removeChild(this._warningCoin);
        this._warningCoin.destroy();
        this._warningCoin = null;
      }
    }, 1200);
  }

  async _handleClick() {
    if (this._isClickProcessing) return;
    this._isClickProcessing = true;

    try {
      const data = this.getFillData();

      if (data.freeSlotsCount === 0) {
        this._showWarning('Нет свободных мест! 🚫');
        eventTracker.trackActionBlocked('grid_full', { context: 'fill_all' });
        return;
      }

      if (data.count === 0 || (this.economy && !this.economy.canAfford(data.cost))) {
        this._showWarning('Мало монет!');
        eventTracker.trackActionBlocked('no_coins', {
          context: 'fill_all',
          cost: Number(data.cost) || 0,
          free_slots: Number(data.freeSlotsCount) || 0,
          balance: this.economy ? Number(this.economy.coins) || 0 : 0
        });
        return;
      }

      await this.onTriggerFillAll(data.count, data.cost);
      this.updateLabel();
    } finally {
      setTimeout(() => {
        this._isClickProcessing = false;
      }, 50);
    }
  }

  destroy(options) {
    if (this._clickAnimTimeout) {
      clearTimeout(this._clickAnimTimeout);
      this._clickAnimTimeout = null;
    }
    if (this._warningTimeout) {
      clearTimeout(this._warningTimeout);
      this._warningTimeout = null;
    }
    super.destroy(options);
  }
}

export default FillAllButton;
