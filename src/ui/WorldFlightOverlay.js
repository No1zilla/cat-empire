import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { TOKENS } from '../styles/design-tokens.js';
import { getWorldTitle } from '../config/worlds.js';

export class WorldFlightOverlay extends Container {
  constructor(app, worldIndex, onDone) {
    super();
    this.app = app;
    this.onDone = onDone || (() => {});
    this.eventMode = 'static';
    this.zIndex = 9999999;
    this._raf = null;
    this._draw(worldIndex);
    this._run();
  }

  _draw(worldIndex) {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.94 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(overlay);

    const title = new Text({
      text: 'ЛЕТИМ',
      style: new TextStyle({
        fontFamily: TOKENS.typography.fontFamily,
        fontSize: 26,
        fontWeight: 'bold',
        fill: TOKENS.colors.gold,
        dropShadow: { color: '#000000', alpha: 0.7, blur: 6 }
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, H / 2 - 24);
    this.addChild(title);

    const sub = new Text({
      text: getWorldTitle(worldIndex),
      style: new TextStyle({
        fontFamily: TOKENS.typography.fontFamily,
        fontSize: 16,
        fill: '#ffffff'
      })
    });
    sub.anchor.set(0.5);
    sub.position.set(W / 2, H / 2 + 16);
    this.addChild(sub);

    this._stars = [];
    for (let i = 0; i < 28; i++) {
      const s = new Graphics();
      s.circle(0, 0, 1.5 + Math.random() * 2);
      s.fill(0xFFD15C);
      s.position.set(Math.random() * W, Math.random() * H);
      this.addChild(s);
      this._stars.push(s);
    }
  }

  _run() {
    const started = Date.now();
    const tick = () => {
      if (this.destroyed) return;
      this._stars.forEach((s) => {
        s.y += 4;
        if (s.y > CONFIG.GAME_HEIGHT) s.y = -4;
      });
      if (Date.now() - started >= 2500) {
        this._close();
        return;
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _close() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (typeof this.onDone === 'function') this.onDone();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default WorldFlightOverlay;
