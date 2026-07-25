import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

/**
 * TASK-012: Кнопка бустера «⚡ Авто-Merge» (бесплатно раз в 5 минут или за 5 💎 гемов)
 */
export class AutoMergeButton extends Container {
  constructor(app, economy, onTriggerAutoMerge) {
    super();
    this.app = app;
    this.economy = economy;
    this.onTriggerAutoMerge = onTriggerAutoMerge || (async () => {});

    this.cooldownSeconds = 300; // 5 минут = 300 сек
    this._timerInterval = null;
    this._btnBg = null;
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

    // 1. Фон кнопки
    this._btnBg = new Graphics();
    this._btnBg.roundRect(0, 0, btnWidth, btnHeight, 14);
    this._btnBg.fill(0x27ae60); // ярко-зелёный неоновый фон
    this._btnBg.stroke({ color: '#ffffff', alpha: 0.4, width: 2 });
    this.addChild(this._btnBg);

    // 2. Текст кнопки
    const titleStyle = new TextStyle({
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.4, blur: 2, distance: 1 }
    });

    this._btnText = new Text({ text: '⚡ Авто-Merge', style: titleStyle });
    this._btnText.anchor.set(0.5, 0);
    this._btnText.position.set(btnWidth / 2, 7);
    this.addChild(this._btnText);

    // 3. Подтекст статуса (Бесплатно / 5 💎 ⏱️ 04:59)
    const subStyle = new TextStyle({
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });

    this._subText = new Text({ text: 'БЕСПЛАТНО', style: subStyle });
    this._subText.anchor.set(0.5, 0);
    this._subText.position.set(btnWidth / 2, 27);
    this.addChild(this._subText);

    // Настройка кликов
    this.on('pointerdown', (e) => {
      e.stopPropagation();
      this._handleClick();
    });

    this.on('pointerover', () => { this.alpha = 0.88; });
    this.on('pointerout',  () => { this.alpha = 1.0; });

    this._updateUI();
  }

  _updateUI() {
    const remaining = this._getRemainingCooldown();

    if (remaining === 0) {
      // Бесплатный режим доступен
      if (this._btnBg) this._btnBg.fill(0x27ae60);
      if (this._subText) {
        this._subText.text = 'БЕСПЛАТНО';
        this._subText.style.fill = '#ffd700';
      }
    } else {
      // Режим кулдауна (стоимость 5 гемов + таймер)
      if (this._btnBg) this._btnBg.fill(0x8e44ad); // фиолетовый для гемов
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
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#e94560',
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
      // Запуск БЕСПЛАТНО
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem('cat_empire_last_free_automerge', String(now));
      this._updateUI();

      await this.onTriggerAutoMerge();
    } else {
      // Кулдаун -> платно за 5 💎 гемов
      const GEM_COST = 5;
      if (this.economy && this.economy.gems < GEM_COST) {
        this._showWarning('Мало 💎 гемов!');
        return;
      }

      if (this.economy) {
        this.economy.gems -= GEM_COST;
        this.economy._notify();
      }

      await this.onTriggerAutoMerge();
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
