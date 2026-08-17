import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
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
    this._w = CONFIG.GAME_WIDTH - 16;
    this._h = 34;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this._draw();
    this._tick();
    this._timer = setInterval(() => this._tick(), 1000);
    this.on('pointertap', () => this._handleClick());
  }

  _draw() {
    const w = this._w;
    const h = this._h;
    const radius = 14;

    this._inner = new Container();
    this._inner.pivot.set(w / 2, h / 2);
    this._inner.position.set(w / 2, h / 2);
    this.addChild(this._inner);

    this._shadow = new Graphics();
    this._inner.addChild(this._shadow);

    this._bg = new Graphics();
    this._inner.addChild(this._bg);

    this._shine = new Graphics();
    this._shine.roundRect(2, 2, w - 4, 13, 10);
    this._shine.fill({ color: 0xffffff, alpha: 0.2 });
    this._inner.addChild(this._shine);

    this._label = new Text({
      text: '2× доход 30 мин за ролик',
      style: new TextStyle({
        fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
        fontSize: 13,
        fontWeight: 'bold',
        fill: '#ffffff',
        dropShadow: { color: '#000000', alpha: 0.55, blur: 2, distance: 1 }
      })
    });
    this._label.anchor.set(0.5);
    this._label.position.set(w / 2, h / 2);
    this._inner.addChild(this._label);

    this.hitArea = new Rectangle(0, 0, w, h);
    this._paint(false);
  }

  _paint(active) {
    const w = this._w;
    const h = this._h;
    const radius = 14;
    const fill = active ? 0x2ecc71 : parseInt(TOKENS.colors.btnMerge.replace('#', '0x'));
    const shadow = active ? 0x1e8449 : 0x6c3483;

    this._shadow.clear();
    this._shadow.roundRect(0, 3, w, h, radius);
    this._shadow.fill(shadow);

    this._bg.clear();
    this._bg.roundRect(0, 0, w, h, radius);
    this._bg.fill(fill);
    this._bg.stroke({ color: 0xffffff, alpha: 0.4, width: 1.5 });
  }

  _tick() {
    const active = incomeBoosterService.isActive();
    this.onMultiplierChange(incomeBoosterService.getMultiplier());
    this._paint(active);
    if (active) {
      this._label.text = `2× активно  ${formatMmSs(incomeBoosterService.remainingMs())}`;
    } else {
      this._label.text = '2× доход 30 мин за ролик';
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
    if (this._inner) this._inner.scale.set(0.96);
    setTimeout(() => {
      if (this._inner && !this.destroyed) this._inner.scale.set(1);
    }, 90);
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
