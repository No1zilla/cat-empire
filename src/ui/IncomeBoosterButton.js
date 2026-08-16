import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { AdModal } from './AdModal.js';
import { incomeBoosterService } from '../game/IncomeBooster.js';

function formatMmSs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class IncomeBoosterButton extends Container {
  constructor(app, economy, onMultiplierChange) {
    super();
    this.app = app;
    this.economy = economy;
    this.onMultiplierChange = onMultiplierChange || (() => {});
    this._timer = null;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this._draw();
    this._tick();
    this._timer = setInterval(() => this._tick(), 1000);
    this.on('pointertap', () => this._handleClick());
  }

  _draw() {
    const w = CONFIG.GAME_WIDTH - 16;
    const h = 36;

    this._shadow = new Graphics();
    this._shadow.roundRect(0, 3, w, h, 12);
    this._shadow.fill({ color: 0x000000, alpha: 0.35 });
    this.addChild(this._shadow);

    this._bg = new Graphics();
    this._bg.roundRect(0, 0, w, h, 12);
    this._bg.fill(0xE53935);
    this._bg.stroke({ color: 0xffffff, alpha: 0.35, width: 1.5 });
    this.addChild(this._bg);

    this._label = new Text({
      text: '🚀 2× доход 30 мин — за рекламу',
      style: new TextStyle({
        fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
        fontSize: 13,
        fontWeight: 'bold',
        fill: '#ffffff'
      })
    });
    this._label.anchor.set(0.5);
    this._label.position.set(w / 2, h / 2);
    this.addChild(this._label);

    this.hitArea = new Rectangle(0, 0, w, h);
  }

  _tick() {
    const active = incomeBoosterService.isActive();
    const multiplier = incomeBoosterService.getMultiplier();
    if (this.economy && this.economy.incomeMultiplier !== multiplier) {
      this.economy.setIncomeMultiplier(multiplier);
      this.onMultiplierChange(multiplier);
    }
    if (active) {
      this._bg.tint = 0x2ecc71;
      this._label.text = `🚀 2× активно  ${formatMmSs(incomeBoosterService.remainingMs())}`;
    } else {
      this._bg.tint = 0xffffff;
      this._label.text = '🚀 2× доход 30 мин — за рекламу';
    }
  }

  _handleClick() {
    if (incomeBoosterService.isActive()) {
      const stage = this.app && this.app.stage ? this.app.stage : this.parent;
      if (stage) UIUtils.showToast(stage, 'Бустер уже активен');
      return;
    }
    const stage = this.app && this.app.stage ? this.app.stage : this.parent;
    if (!stage) return;
    stage.sortableChildren = true;
    const modal = new AdModal(this.app, this.economy, () => {
      incomeBoosterService.activate();
      this.economy.setIncomeMultiplier(2);
      this.onMultiplierChange(2);
      this._tick();
      UIUtils.showToast(stage, 'Доход ×2 на 30 минут');
    }, 0, 'Бустер 2× через:');
    modal.zIndex = 9999999;
    stage.addChild(modal);
  }

  destroy(options) {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    super.destroy(options);
  }
}

export default IncomeBoosterButton;
