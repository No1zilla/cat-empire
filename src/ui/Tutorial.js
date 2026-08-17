import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { eventBus } from '../utils/EventBus.js';
import { getTutorialTargets } from '../game/firstSession.js';

/**
 * Первый запуск: дыра над двумя котами, клики проходят на поле.
 * Слияние закрывает туториал — окно нового кота и есть награда.
 */
export class Tutorial extends Container {
  constructor(app, onComplete) {
    super();
    this.app = app;
    this.onComplete = onComplete || (() => {});
    this._handRaf = null;
    this._done = false;
    this._onMerge = () => this._complete();
    this.eventMode = 'passive';
    this._draw();
    eventBus.on('CATS_MERGED', this._onMerge);
  }

  _draw() {
    this.removeChildren();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const hole = getTutorialTargets().slots;
    const pad = 6;
    const hx = hole.x - pad;
    const hy = hole.y - pad;
    const hw = hole.w + pad * 2;
    const hh = hole.h + pad * 2;

    this._addShade(0, 0, W, hy);
    this._addShade(0, hy + hh, W, Math.max(0, H - (hy + hh)));
    this._addShade(0, hy, hx, hh);
    this._addShade(hx + hw, hy, Math.max(0, W - (hx + hw)), hh);

    const spotlight = new Graphics();
    spotlight.roundRect(hx, hy, hw, hh, 14);
    spotlight.fill({ color: 0xffffff, alpha: 0.12 });
    spotlight.stroke({ color: 0xffd700, width: 2.5, alpha: 0.95 });
    spotlight.eventMode = 'none';
    this.addChild(spotlight);

    const cardY = 250;
    const cardH = 150;
    const card = new Graphics();
    card.roundRect(30, cardY, 350, cardH, 16);
    card.fill(CONFIG.COLORS.GRID_BG || 0x16213e);
    card.stroke({ color: CONFIG.COLORS.ACCENT || 0xe94560, width: 2 });
    card.eventMode = 'static';
    this.addChild(card);

    const title = new Text({
      text: 'Сдвинь двух котиков',
      style: new TextStyle({
        fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
        fontSize: 18,
        fontWeight: 'bold',
        fill: '#ffffff',
        align: 'center'
      })
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, cardY + 22);
    this.addChild(title);

    const desc = new Text({
      text: 'Возьми одного и положи\nна второго такого же.\nЭто и есть империя.',
      style: new TextStyle({
        fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
        fontSize: 14,
        fill: '#cccccc',
        align: 'center',
        lineHeight: 20
      })
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(W / 2, cardY + 54);
    this.addChild(desc);

    const skip = new Text({
      text: '✕',
      style: new TextStyle({
        fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
        fontSize: 18,
        fontWeight: 'bold',
        fill: '#aaaaaa'
      })
    });
    skip.anchor.set(1, 0);
    skip.position.set(365, cardY + 12);
    skip.eventMode = 'static';
    skip.cursor = 'pointer';
    skip.on('pointerdown', (e) => {
      e.stopPropagation();
      this._complete();
    });
    this.addChild(skip);

    const hand = new Text({
      text: '👆',
      style: new TextStyle({ fontSize: 34 })
    });
    hand.anchor.set(0.5);
    hand.eventMode = 'none';
    this.addChild(hand);

    const startX = hx + 28;
    const endX = hx + hw - 28;
    const handY = hy + hh / 2;
    const period = 1200;
    const handStart = performance.now();
    const animHand = (now) => {
      const t = ((now - handStart) % period) / period;
      const ease = Math.sin(t * Math.PI);
      hand.x = startX + (endX - startX) * ease;
      hand.y = handY;
      this._handRaf = requestAnimationFrame(animHand);
    };
    this._handRaf = requestAnimationFrame(animHand);
  }

  _addShade(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    const shade = new Graphics();
    shade.rect(x, y, w, h);
    shade.fill({ color: 0x000000, alpha: 0.75 });
    shade.eventMode = 'static';
    shade.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(shade);
  }

  _complete() {
    if (this._done) return;
    this._done = true;
    if (this._handRaf) {
      cancelAnimationFrame(this._handRaf);
      this._handRaf = null;
    }
    eventBus.off('CATS_MERGED', this._onMerge);
    try {
      localStorage.setItem('cat_empire_tutorial_done', '1');
    } catch (e) {}
    const done = this.onComplete;
    this.onComplete = () => {};
    if (typeof done === 'function') done();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default Tutorial;
