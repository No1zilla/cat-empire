import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { RUBY_AD_REWARD } from '../config/rubyShop.js';

export class OutOfRubiesModal extends Container {
  constructor(app, { onBuy, onWatchAd, onClose } = {}) {
    super();
    this.app = app;
    this.onBuy = onBuy || (() => {});
    this.onWatchAd = onWatchAd || (() => {});
    this.onClose = onClose || (() => {});
    this.eventMode = 'static';
    this.zIndex = 9999998;
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
    const modalH = 280;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFFD15C, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: 'Закончились рубины?',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#FFD15C'
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 36);
    this.addChild(title);

    const sub = new Text({
      text: 'Сначала ролик +5 рубинов. Казна — если хочешь пак.',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 13,
        fill: '#cfc8e8',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 280
      })
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(W / 2, modalY + 64);
    this.addChild(sub);

    const adBtn = UIUtils.createButton(
      modalX + 24,
      modalY + 118,
      modalW - 48,
      48,
      `Смотреть рекламу (+${RUBY_AD_REWARD})`,
      0x2ecc71,
      () => {
        this._close();
        this.onWatchAd();
      }
    );
    this.addChild(adBtn);

    const buyBtn = UIUtils.createButton(
      modalX + 24,
      modalY + 174,
      modalW - 48,
      44,
      'Казна: паки за голоса',
      0xE53935,
      () => {
        this._close();
        this.onBuy();
      }
    );
    this.addChild(buyBtn);

    const close = UIUtils.createButton(
      modalX + (modalW - 120) / 2,
      modalY + modalH - 40,
      120,
      28,
      'Закрыть',
      0x3d356c,
      () => this._close()
    );
    this.addChild(close);
  }

  _close() {
    if (typeof this.onClose === 'function') this.onClose();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default OutOfRubiesModal;
