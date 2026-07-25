import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

/**
 * Объёмная кнопка «📦 Всё» (Массовый выкуп свободных ячеек за 1 клик)
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
    this._subText = null;
    this._warningText = null;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this._draw();
  }

  // Расчёт стоимости и количества доступных котиков для массовой покупки
  getFillData() {
    if (!this.grid || !this.economy) return { count: 0, cost: 0 };

    const freeSlotsCount = this.grid.slots.filter((slot) => slot === null).length;
    if (freeSlotsCount === 0) return { count: 0, cost: 0 };

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
    if (this._subText) {
      if (freeSlotsCount === 0) {
        this._subText.text = 'ПОЛНО';
        this._subText.style.fill = '#9ca3af';
      } else if (count === 0) {
        const nextCost = 10 + (this.economy ? this.economy.totalCatsBought : 0);
        this._subText.text = `${nextCost} 🪙`;
        this._subText.style.fill = '#ff4757';
      } else {
        this._subText.text = `${count} шт (${cost} 🪙)`;
        this._subText.style.fill = '#ffd700';
      }
    }
  }

  _draw() {
    this.removeChildren();

    const btnWidth = 95;
    const btnHeight = 50;

    // 1. Нижняя объёмная тень
    this._shadowBg = new Graphics();
    this._shadowBg.roundRect(0, 4, btnWidth, btnHeight, 14);
    this._shadowBg.fill(0x273c75);
    this.addChild(this._shadowBg);

    // 2. Основная градиентная карточка (Синий/Индиго)
    this._btnBg = new Graphics();
    this._btnBg.roundRect(0, 0, btnWidth, btnHeight, 14);
    this._btnBg.fill(0x487eb0);
    this._btnBg.stroke({ color: '#ffffff', alpha: 0.5, width: 2 });
    this.addChild(this._btnBg);

    // 3. Блик
    const shine = new Graphics();
    shine.roundRect(2, 2, btnWidth - 4, 18, 10);
    shine.fill({ color: 0xffffff, alpha: 0.22 });
    this.addChild(shine);

    // 4. Текст кнопки "📦 Всё"
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 3, distance: 1 }
    });

    this._btnText = new Text({ text: '📦 Всё', style: titleStyle });
    this._btnText.anchor.set(0.5, 0);
    this._btnText.position.set(btnWidth / 2, 6);
    this.addChild(this._btnText);

    // 5. Подтекст статуса/стоимости
    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });

    this._subText = new Text({ text: '0 шт', style: subStyle });
    this._subText.anchor.set(0.5, 0);
    this._subText.position.set(btnWidth / 2, 26);
    this.addChild(this._subText);

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
    this.scale.set(0.94);
    setTimeout(() => {
      if (!this.destroyed) this.scale.set(1.0);
    }, 100);
  }

  _showWarning(text) {
    if (this._warningText) {
      this.removeChild(this._warningText);
      this._warningText.destroy();
      this._warningText = null;
    }

    const warnStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ff4757',
      align: 'center'
    });

    this._warningText = new Text({ text, style: warnStyle });
    this._warningText.anchor.set(0.5, 0.5);
    this._warningText.position.set(47, -15);
    this.addChild(this._warningText);

    setTimeout(() => {
      if (this._warningText) {
        this.removeChild(this._warningText);
        this._warningText.destroy();
        this._warningText = null;
      }
    }, 1000);
  }

  async _handleClick() {
    const { count, cost, freeSlotsCount } = this.getFillData();

    if (freeSlotsCount === 0) {
      this._showWarning('Поле полно!');
      return;
    }

    if (count === 0) {
      this._showWarning('Мало 🪙!');
      return;
    }

    await this.onTriggerFillAll(count, cost);
    this.updateLabel();
  }
}

export default FillAllButton;
