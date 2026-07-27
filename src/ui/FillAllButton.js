import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
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

    // Модель D: Прогрессивный налог гемов (0 💎 -> 1 💎 -> 2 💎)
    this._fillCount = 0;
    this._lastFillTime = Date.now();
    this.RESET_COOLDOWN_MS = 5 * 60 * 1000; // 5 минут до бесплатного сброса

    this._btnBg = null;
    this._shadowBg = null;
    this._btnText = null;
    this._subText = null;
    this._warningText = null;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this._draw();
  }

  // Расчёт текущего налога гемов (0 💎 -> 1 💎 -> 2 💎)
  getGemTax() {
    // Сброс счетчика через 5 минут простоя
    if (Date.now() - this._lastFillTime > this.RESET_COOLDOWN_MS) {
      this._fillCount = 0;
    }
    if (this._fillCount === 0) return 0;
    if (this._fillCount === 1) return 1;
    return 2;
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
      const catCost = 10 + (currentBought + i);
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
    const gemTax = this.getGemTax();

    if (this._subText) {
      this._subText.removeChildren();
      if (this._btnText) this._btnText.text = '📦 Заполнить';
      if (this._btnBg) this._btnBg.fill(gemTax > 0 ? 0xd35400 : 0xff9f43);

      if (freeSlotsCount === 0) {
        this._subText.text = 'ЗАПОЛНЕНО';
        this._subText.style.fill = '#e5e7eb';
      } else if (count === 0) {
        const nextCost = 10 + (this.economy ? this.economy.totalCatsBought : 0);
        this._subText.text = `${nextCost} `;
        const coinIcon = UIUtils.createCoinIcon(6, true);
        coinIcon.position.set(this._subText.width / 2 + 8, 8);
        this._subText.addChild(coinIcon);
        this._subText.style.fill = '#fff3a0';
      } else {
        const formattedCost = cost >= 1000000 ? (cost / 1000000).toFixed(1) + 'M' : (cost >= 1000 ? (cost / 1000).toFixed(1) + 'K' : cost);
        
        if (gemTax > 0) {
          this._subText.text = `${count} шт (${formattedCost} 🪙 +${gemTax} 💎)`;
          this._subText.style.fill = '#ffd1a4';
        } else {
          this._subText.text = `${count} шт (${formattedCost} 🪙)`;
          this._subText.style.fill = '#ffffff';
        }
      }
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

    // 5. Подтекст количества и стоимости
    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.4, blur: 2, distance: 1 }
    });

    this._subText = new Text({ text: '0 шт', style: subStyle });
    this._subText.anchor.set(0.5, 0);
    this._subText.position.set(btnWidth / 2, 26);
    this._innerContainer.addChild(this._subText);

    // Интерактивность
    this.on('pointerdown', (e) => {
      e.stopPropagation();
      this._playClickAnim();
      this._handleClick();
    });

    this.on('pointerover', () => { this.alpha = 0.92; });
    this.on('pointerout',  () => { this.alpha = 1.0; });

    this.updateLabel();
  }

  _playClickAnim() {
    if (this._innerContainer) this._innerContainer.scale.set(0.90);
    setTimeout(() => {
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
    this._warningText.position.set(52, -18);
    this.addChild(this._warningText);

    if (showCoin) {
      this._warningCoin = UIUtils.createCoinIcon(7, true);
      this._warningCoin.position.set(52 + this._warningText.width / 2 + 6, -18);
      this.addChild(this._warningCoin);
    }

    setTimeout(() => {
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
      this._showWarning('Мало монет! ', true);
      return;
    }

    const gemTax = this.getGemTax();

    // Проверка наличия гемов при наличии налога
    if (gemTax > 0) {
      if (this.economy && this.economy.gems < gemTax) {
        // Не хватает гемов -> открываем просмотр рекламы для сброса налога обратно на 0 💎!
        const stage = this.app ? this.app.stage : (this.parent || this.stage);
        if (stage) {
          stage.sortableChildren = true;
          const adModal = new AdModal(this.app, this.economy, () => {
            this._fillCount = 0; // Сброс налога до 0 💎!
            this.updateLabel();
            this._showWarning('Налог сброшен! ✨');
          }, 1);
          adModal.zIndex = 99999;
          stage.addChild(adModal);
        } else {
          this._showWarning('Ошибка запуска 🚫');
        }
        return;
      }

      // Списываем налог гемов
      try {
        this.economy.spendGems(gemTax);
        this._showWarning(`-${gemTax} 💎 списано!`);
      } catch (e) {
        this._showWarning('Мало 💎 гемов!');
        return;
      }
    }

    // Запускаем покупку
    this._fillCount++;
    this._lastFillTime = Date.now();

    await this.onTriggerFillAll(count, cost);
    this.updateLabel();
  }
}

export default FillAllButton;
