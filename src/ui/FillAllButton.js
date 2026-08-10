import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { BALANCE } from '../config/balance.js';
import { UIUtils } from '../utils/UIUtils.js';
import { showRewardedAd } from '../api/client.js';
import { AdModal } from './AdModal.js';

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

    this._draw();
  }

  // Расчёт стоимости и количества доступных котиков для массовой покупки
  getFillData() {
    if (!this.grid || !this.economy) return { count: 0, cost: 0, freeSlotsCount: 0 };

    const freeSlotsCount = this.grid.slots.filter((slot) => slot === null).length;
    if (freeSlotsCount === 0) return { count: 0, cost: 0, freeSlotsCount: 0 };

    let totalCost = 0;
    let count = 0;
    const currentBought = this.economy.totalCatsBought || 0;

    for (let i = 0; i < freeSlotsCount; i++) {
      const catCost = BALANCE.calculateCatCost(currentBought + i);
      if (this.economy.coins >= totalCost + catCost) {
        totalCost += catCost;
        count++;
      } else {
        break;
      }
    }

    return { count, cost: totalCost, freeSlotsCount };
  }

  updateLabel() {
    const { count, cost, freeSlotsCount } = this.getFillData();

    if (!this._subContainer) return;
    this._subContainer.removeChildren();

    if (this._btnText) this._btnText.text = '📦 Заполнить';
    if (this._btnBg) this._btnBg.fill(0xff9f43);

    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.4, blur: 2, distance: 1 }
    });

    const btnWidth = 122;

    if (freeSlotsCount === 0) {
      if (this._btnText) this._btnText.text = '📦 Заполнить';
      if (this._btnBg) this._btnBg.fill(0xff9f43);
      if (this._shadowBg) this._shadowBg.fill(0xd35400);

      const textStyle = new TextStyle({ ...subStyle, fill: '#e5e7eb' });
      const textObj = new Text({ text: 'ЗАПОЛНЕНО', style: textStyle });
      textObj.anchor.set(0.5, 0.5);
      textObj.position.set(0, 0);
      this._subContainer.addChild(textObj);
      this._subContainer.pivot.set(0, 0);
      this._subContainer.position.set(btnWidth / 2, 33);
    } else if (count === 0) {
      if (this._btnText) {
        this._btnText.text = '🎬 БЕСПЛАТНО';
        this._btnText.style.fontSize = 13;
        this._btnText.position.set(btnWidth / 2, 14);
      }
      if (this._btnBg) {
        this._btnBg.fill(0x2ecc71);
        this._btnBg.stroke({ color: '#ffffff', alpha: 0.8, width: 2 });
      }
      if (this._shadowBg) this._shadowBg.fill(0x1e8449);

      this._subContainer.removeChildren();
    } else {
      const formattedCost = cost >= 1000000 ? (cost / 1000000).toFixed(1) + 'M' : (cost >= 1000 ? (cost / 1000).toFixed(1) + 'K' : cost);
      const text1Obj = new Text({ text: `${count} шт (${formattedCost} `, style: subStyle });
      text1Obj.anchor.set(0, 0.5);
      text1Obj.position.set(0, 0);

      const coinRadius = 6;
      const coinIcon = UIUtils.createCoinIcon(coinRadius);
      const gap = 3;
      coinIcon.position.set(text1Obj.width + gap + coinRadius, 0);

      const text2Obj = new Text({ text: ')', style: subStyle });
      text2Obj.anchor.set(0, 0.5);
      text2Obj.position.set(text1Obj.width + gap + (coinRadius * 2) + gap, 0);

      this._subContainer.addChild(text1Obj);
      this._subContainer.addChild(coinIcon);
      this._subContainer.addChild(text2Obj);

      const totalWidth = text1Obj.width + gap + (coinRadius * 2) + gap + text2Obj.width;
      this._subContainer.pivot.set(totalWidth / 2, 0);
      this._subContainer.position.set(btnWidth / 2, 33);
    }
  }

  _draw() {
    this.removeChildren();

    const btnWidth = 122;
    const btnHeight = 50;

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
      fontSize: 12,
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
    this.hitArea = new Rectangle(0, 0, btnWidth, btnHeight);

    let lastFATapTime = 0;
    const triggerFillAllClick = (e) => {
      const now = Date.now();
      if (now - lastFATapTime < 300) return;
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
    this._warningText.position.set(61, -18);
    this.addChild(this._warningText);

    if (showCoin) {
      this._warningCoin = UIUtils.createCoinIcon(7, true);
      this._warningCoin.position.set(61 + this._warningText.width / 2 + 6, -18);
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
    const { count, cost, freeSlotsCount } = this.getFillData();

    if (freeSlotsCount === 0) {
      this._showWarning('Нет свободных мест! 🚫');
      return;
    }

    if (count === 0 || (this.economy && !this.economy.canAfford(cost))) {
      // 1. Запуск нативной рекламы VK в среде VK Mini Apps
      if (typeof window !== 'undefined' && window.vkBridge && typeof window.vkBridge.send === 'function') {
        const adRes = await showRewardedAd();
        if (adRes && adRes.success) {
          await this.onTriggerFillAll(freeSlotsCount, 0);
          this.updateLabel();
        } else {
          const appStage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
          if (appStage) {
            UIUtils.showToast(appStage, adRes ? `⚠️ VK Ads: ${adRes.reason}` : '⚠️ Просмотр отменён');
          }
        }
        return;
      }

      // 2. Фолбэк плеера LiveAd только вне платформы ВКонтакте
      const appStage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
      if (appStage) {
        appStage.sortableChildren = true;
        const modal = new AdModal(this.app, this.economy, async () => {
          await this.onTriggerFillAll(freeSlotsCount, 0);
          this.updateLabel();
        }, 0);
        modal.zIndex = 9999999;
        appStage.addChild(modal);
      }
      return;
    }

    await this.onTriggerFillAll(count, cost);
    this.updateLabel();
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
