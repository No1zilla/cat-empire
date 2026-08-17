import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { empireMeta } from '../game/EmpireMeta.js';
import { eventTracker } from '../analytics/EventTracker.js';

export class VassalsModal extends Container {
  constructor(app, economy, onInvite, onClose) {
    super();
    this.app = app;
    this.economy = economy;
    this.onInvite = onInvite || (async () => ({ success: false }));
    this.onClose = onClose || (() => {});
    this.eventMode = 'static';
    this.zIndex = 9999999;
    this._draw();
  }

  _draw() {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const font = TOKENS.typography.fontFamily;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(overlay);

    const modalW = 330;
    const modalH = 300;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFFD15C, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: 'СОЗВАТЬ ВАССАЛОВ',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 20,
        fontWeight: 'bold',
        fill: TOKENS.colors.gold
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 40);
    this.addChild(title);

    const sub = new Text({
      text: 'Земля 2 взята. Пусть придут коты\nс соседних дворов. +10 рубинов, один раз.',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 13,
        fill: '#cfc8e8',
        align: 'center'
      })
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(W / 2, modalY + 72);
    this.addChild(sub);

    const invite = UIUtils.createButton(
      modalX + 24,
      modalY + 150,
      modalW - 48,
      48,
      'Созвать вассалов',
      0x0077FF,
      () => this._invite()
    );
    this.addChild(invite);

    const later = UIUtils.createButton(
      modalX + 24,
      modalY + 210,
      modalW - 48,
      36,
      'Позже',
      0x3d356c,
      () => this._close()
    );
    this.addChild(later);
  }

  async _invite() {
    const stage = this.app && this.app.stage ? this.app.stage : this.parent;
    const result = await this.onInvite();
    if (result && result.success && !result.simulated) {
      if (this.economy) this.economy.addGems(10);
      empireMeta.markVassalsSummoned();
      eventTracker.track('vassals_summoned', { reward_gems: 10 });
      if (stage) UIUtils.showToast(stage, `Вассалы услышали. +${UIUtils.formatRubies(10)}`);
      this._close();
    } else if (result && result.simulated) {
      if (stage) UIUtils.showToast(stage, '🤝 Приглашения доступны внутри VK');
    } else if (stage) {
      UIUtils.showToast(stage, 'Приглашение отменено');
    }
  }

  _close() {
    if (typeof this.onClose === 'function') this.onClose();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default VassalsModal;
