import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { saveProgress } from '../api/client.js';

/**
 * Объёмная кнопка бустера «⚡ Соединить все» с анимацией нажатия и градиентом
 */
export class AutoMergeButton extends Container {
  constructor(app, economy, onTriggerAutoMerge) {
    super();
    this.app = app;
    this.economy = economy;
    this.onTriggerAutoMerge = onTriggerAutoMerge || (async () => {});

    this.cooldownSeconds = 300;
    this._timerInterval = null;
    this._btnBg = null;
    this._shadowBg = null;
    this._btnText = null;
    this._subText = null;
    this._warningText = null;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this._draw();
    this._startTimerLoop();
  }

  _getRemainingCooldown() {
    const lastTime = parseInt(localStorage.getItem('cat_empire_last_free_automerge') || '0', 10);
    if (!lastTime) return 0;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - lastTime;
    return Math.max(0, this.cooldownSeconds - elapsed);
  }

  _draw() {
    this.removeChildren();

    const btnWidth = 140;
    const btnHeight = 50;

    // 1. Нижняя объёмная тень
    this._shadowBg = new Graphics();
    this._shadowBg.roundRect(0, 4, btnWidth, btnHeight, 14);
    this._shadowBg.fill(0x1e8449);
    this.addChild(this._shadowBg);

    // 2. Фон кнопки
    this._btnBg = new Graphics();
    this._btnBg.roundRect(0, 0, btnWidth, btnHeight, 14);
    this._btnBg.fill(0x2ecc71);
    this._btnBg.stroke({ color: '#ffffff', alpha: 0.5, width: 2 });
    this.addChild(this._btnBg);

    // 3. Блик
    const shine = new Graphics();
    shine.roundRect(2, 2, btnWidth - 4, 18, 10);
    shine.fill({ color: 0xffffff, alpha: 0.22 });
    this.addChild(shine);

    // 4. Текст кнопки "⚡ Соединить все"
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
    this.addChild(this._btnText);

    // 5. Подтекст статуса
    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });

    this._subText = new Text({ text: 'БЕСПЛАТНО', style: subStyle });
    this._subText.anchor.set(0.5, 0);
    this._subText.position.set(btnWidth / 2, 26);
    this.addChild(this._subText);

    // Настройка кликов и микро-анимации
    this.on('pointerdown', (e) => {
      e.stopPropagation();
      this._playClickAnim();
      this._handleClick();
    });

    this.on('pointerover', () => { this.alpha = 0.92; });
    this.on('pointerout',  () => { this.alpha = 1.0; });

    this._updateUI();
  }

  _playClickAnim() {
    this.scale.set(0.94);
    setTimeout(() => {
      if (!this.destroyed) this.scale.set(1.0);
    }, 100);
  }

  _updateUI() {
    const remaining = this._getRemainingCooldown();

    if (remaining === 0) {
      if (this._shadowBg) this._shadowBg.fill(0x1e8449);
      if (this._btnBg) this._btnBg.fill(0x2ecc71);
      if (this._subText) {
        this._subText.text = 'БЕСПЛАТНО';
        this._subText.style.fill = '#ffd700';
      }
    } else {
      if (this._shadowBg) this._shadowBg.fill(0x6c3483);
      if (this._btnBg) this._btnBg.fill(0x8e44ad);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (this._subText) {
        this._subText.text = `5 💎 ⏱️ ${timeStr}`;
        this._subText.style.fill = '#a8d8ff';
      }
    }
  }

  _startTimerLoop() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => {
      this._updateUI();
    }, 1000);
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
    const remaining = this._getRemainingCooldown();

    if (remaining === 0) {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem('cat_empire_last_free_automerge', String(now));
      this._updateUI();

      await this.onTriggerAutoMerge();
    } else {
      const GEM_COST = 5;
      if (this.economy && this.economy.gems < GEM_COST) {
        this._showWarning('Мало 💎 гемов!');
        return;
      }

      if (this.economy) {
        try {
          this.economy.spendGems(GEM_COST);
        } catch (e) {
          this._showWarning('Мало 💎 гемов!');
          return;
        }
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
