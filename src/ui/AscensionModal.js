import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { getCatTexture } from '../utils/catTextures.js';
import { eventBus } from '../utils/EventBus.js';

/**
 * Кульминация 15 уровня — Кото-Бог (TASK-027).
 */
export class AscensionModal extends Container {
  constructor(app, { onFly, onStay } = {}) {
    super();
    this.app = app;
    this.onFly = onFly || (() => {});
    this.onStay = onStay || (() => {});
    this.eventMode = 'static';
    this.zIndex = 999999;
    this._particles = [];
    this._raf = null;
    this._draw();
    this._burst();
  }

  _draw() {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const font = TOKENS.typography.fontFamily;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.92 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(overlay);

    this._fxLayer = new Container();
    this.addChild(this._fxLayer);

    const title = new Text({
      text: 'КОТО-БОГ ПРОБУДИЛСЯ',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 22,
        fontWeight: 'bold',
        fill: ['#FFD15C', '#ffffff'],
        dropShadow: { color: '#000000', alpha: 0.8, blur: 6 },
        letterSpacing: 1
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, 110);
    this.addChild(title);

    const tex = getCatTexture(15);
    if (tex) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.width = 180;
      sprite.height = 180;
      sprite.position.set(W / 2, 270);
      this.addChild(sprite);
    } else {
      const emoji = new Text({
        text: '🏆',
        style: new TextStyle({ fontSize: 96 })
      });
      emoji.anchor.set(0.5);
      emoji.position.set(W / 2, 270);
      this.addChild(emoji);
    }

    const reward = new Text({
      text: 'Империя покорила небеса!\nНаграда: +50 рубинов. Портал на землю дюн открыт.',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 14,
        fill: '#ffffff',
        align: 'center',
        dropShadow: { color: '#000000', alpha: 0.6, blur: 3 }
      })
    });
    reward.anchor.set(0.5);
    reward.position.set(W / 2, 390);
    this.addChild(reward);

    const flyBtn = UIUtils.createButton(
      (W - 240) / 2,
      450,
      240,
      48,
      'ЛЕТЕТЬ НА ЗЕМЛЮ ДЮН',
      0xFF6B6B,
      () => this._fly()
    );
    this.addChild(flyBtn);

    const stayBtn = UIUtils.createButton(
      (W - 240) / 2,
      508,
      240,
      40,
      'Позже',
      0x3d356c,
      () => this._stay()
    );
    this.addChild(stayBtn);
  }

  _burst() {
    const W = CONFIG.GAME_WIDTH;
    const colors = [0xFFD15C, 0xFF6B6B, 0xA55EEA, 0x2ecc71, 0x00f2fe];
    for (let i = 0; i < 42; i++) {
      const p = new Graphics();
      const size = 3 + Math.random() * 5;
      if (i % 2 === 0) p.star(0, 0, 4, size, size * 0.45);
      else p.circle(0, 0, size);
      p.fill(colors[i % colors.length]);
      p.position.set(W / 2, 270);
      this._fxLayer.addChild(p);
      this._particles.push({
        g: p,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 7 - 2,
        life: 1
      });
    }

    const tick = () => {
      if (this.destroyed) return;
      this._particles.forEach((p) => {
        p.vy += 0.18;
        p.g.x += p.vx;
        p.g.y += p.vy;
        p.life -= 0.012;
        p.g.alpha = Math.max(0, p.life);
        p.g.rotation += 0.08;
      });
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
    eventBus.emit('NEW_CAT_UNLOCKED', { level: 15 });
  }

  _fly() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (typeof this.onFly === 'function') this.onFly();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }

  _stay() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (typeof this.onStay === 'function') this.onStay();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default AscensionModal;
