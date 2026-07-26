import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { saveProgress, showRewardedAd } from '../api/client.js';
import { AdModal } from './AdModal.js';

/**
 * Объёмная кнопка бустера «⚡ Соединить все» с анимацией нажатия и градиентом
 */
export class AutoMergeButton extends Container {
  constructor(app, economy, onTriggerAutoMerge) {
    super();
    this.app = app;
    this.economy = economy;
    this.onTriggerAutoMerge = onTriggerAutoMerge || (async () => {});

    this._btnBg = null;
    this._shadowBg = null;
    this._btnText = null;
    this._subText = null;
    this._warningText = null;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this._draw();
  }

  _draw() {
    this.removeChildren();

    const btnWidth = 122;
    const btnHeight = 50;

    this._innerContainer = new Container();
    this._innerContainer.pivot.set(btnWidth / 2, btnHeight / 2);
    this._innerContainer.position.set(btnWidth / 2, btnHeight / 2);
    this.addChild(this._innerContainer);

    // 1. Нижняя объёмная тень
    this._shadowBg = new Graphics();
    this._shadowBg.roundRect(0, 4, btnWidth, btnHeight, 14);
    this._shadowBg.fill(0x6c3483);
    this._innerContainer.addChild(this._shadowBg);

    // 2. Фон кнопки (Фиолетовый нативный градиент Рекламы VK)
    this._btnBg = new Graphics();
    this._btnBg.roundRect(0, 0, btnWidth, btnHeight, 14);
    this._btnBg.fill(0x8e44ad);
    this._btnBg.stroke({ color: '#ffffff', alpha: 0.6, width: 2 });
    this._innerContainer.addChild(this._btnBg);

    // 3. Блик
    const shine = new Graphics();
    shine.roundRect(2, 2, btnWidth - 4, 18, 10);
    shine.fill({ color: 0xffffff, alpha: 0.22 });
    this._innerContainer.addChild(shine);

    // 4. Текст кнопки "⚡ Соединить"
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 3, distance: 1 }
    });

    this._btnText = new Text({ text: '⚡ Соединить', style: titleStyle });
    this._btnText.anchor.set(0.5, 0);
    this._btnText.position.set(btnWidth / 2, 6);
    this._innerContainer.addChild(this._btnText);

    // 5. Красивый сочный центрированный подтекст "+5 💎"
    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: '900',
      fill: '#82efff',
      dropShadow: { color: '#000000', alpha: 0.7, blur: 3, distance: 1 }
    });

    this._subText = new Text({ text: '+5 💎', style: subStyle });
    this._subText.anchor.set(0.5, 0);
    this._subText.position.set(btnWidth / 2, 26);
    this._innerContainer.addChild(this._subText);

    // Настройка кликов и микро-анимации
    this.on('pointerdown', (e) => {
      e.stopPropagation();
      this._playClickAnim();
      this._handleClick();
    });

    this.on('pointerover', () => { this.alpha = 0.92; });
    this.on('pointerout',  () => { this.alpha = 1.0; });
  }

  _playClickAnim() {
    if (this._innerContainer) this._innerContainer.scale.set(0.90);
    setTimeout(() => {
      if (!this.destroyed && this._innerContainer) this._innerContainer.scale.set(1.0);
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
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ff4757',
      align: 'center'
    });

    this._warningText = new Text({ text, style: warnStyle });
    this._warningText.anchor.set(0.5, 0.5);
    this._warningText.position.set(70, -18);
    this.addChild(this._warningText);

    setTimeout(() => {
      if (this._warningText) {
        this.removeChild(this._warningText);
        this._warningText.destroy();
        this._warningText = null;
      }
    }, 1200);
  }

  async _handleClick() {
    const GEM_COST = 5;

    // 1. Если у игрока ХВАТАЕТ гемов (gems >= 5) -> списываем 5 гемов и соединяем БЕЗ ВИДЕО!
    if (this.economy && this.economy.gems >= GEM_COST) {
      try {
        this.economy.spendGems(GEM_COST);
        this._showWarning('-5 💎 списано! ⚡');
      } catch (e) {
        this._showWarning('Мало 💎 гемов!');
        return;
      }

      await this.onTriggerAutoMerge();

      try {
        await saveProgress({
          coins: this.economy ? this.economy.coins : undefined,
          gems: this.economy ? this.economy.gems : undefined,
          totalCatsBought: this.economy ? this.economy.totalCatsBought : undefined
        });
      } catch (err) {
        console.error('Ошибка автосохранения гемов:', err);
      }
      return;
    }

    // 2. Если гемов НЕ ХВАТАЕТ (gems < 5) -> открываем просмотр рекламы для начисления +5 💎!
    const stage = this.app ? this.app.stage : (this.parent || this.stage);
    if (stage) {
      stage.sortableChildren = true;
      const adModal = new AdModal(this.app, this.economy, null, 5);
      adModal.zIndex = 99999;
      stage.addChild(adModal);
    } else {
      this._showWarning('Ошибка запуска 🚫');
    }
  }

  destroy(options) {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    super.destroy(options);
  }
}

export default AutoMergeButton;
