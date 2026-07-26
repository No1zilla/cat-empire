import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';

/**
 * Премиальный HUD AAA-уровня
 */
export class HUD extends Container {
  constructor(app, onOpenCollection) {
    super();
    this.app = app;
    this.onOpenCollection = onOpenCollection || (() => {});
    this._coinsText = null;
    this._gemsText = null;
    this._ipsText = null;

    this._draw();
  }

  _draw() {
    this.removeChildren();
    const hudWidth = CONFIG.GAME_WIDTH || 400;
    const hudHeight = 46;

    // 1. Тёмно-синий монолитный фон
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill(0x0a0d24);
    bg.stroke({ color: 0x1f2754, width: 1.5 });
    this.addChild(bg);

    const capH = 34;
    const capY = 6;
    const capRadius = 16;
    const font = CONFIG.FONT_FAMILY || 'Fredoka, sans-serif';

    // 2. КАПСУЛА 1: Монеты (Слева)
    const cap1W = 148;
    const cap1X = 8;
    const cap1 = new Graphics();
    cap1.roundRect(cap1X, capY, cap1W, capH, capRadius);
    cap1.fill(0x13193a);
    cap1.stroke({ color: 0x222b5e, width: 1.5 });
    this.addChild(cap1);

    const coinIcon = UIUtils.createCoinIcon(10);
    coinIcon.position.set(cap1X + 16, capY + capH / 2);
    this.addChild(coinIcon);

    const coinsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.anchor.set(0, 0.5);
    this._coinsText.position.set(cap1X + 32, capY + capH / 2);
    this.addChild(this._coinsText);

    // 3. КАПСУЛА 2: Гемы (По центру)
    const cap2W = 94;
    const cap2X = 162;
    const cap2 = new Graphics();
    cap2.roundRect(cap2X, capY, cap2W, capH, capRadius);
    cap2.fill(0x13193a);
    cap2.stroke({ color: 0x222b5e, width: 1.5 });
    this.addChild(cap2);

    const gemIcon = UIUtils.createGemIcon(11);
    gemIcon.position.set(cap2X + 18, capY + capH / 2);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.anchor.set(0, 0.5);
    this._gemsText.position.set(cap2X + 34, capY + capH / 2);
    this.addChild(this._gemsText);

    // 4. КАПСУЛА 3: Доход в секунду (Справа)
    const cap3W = 130;
    const cap3X = 262;
    const cap3 = new Graphics();
    cap3.roundRect(cap3X, capY, cap3W, capH, capRadius);
    cap3.fill(0x13193a);
    cap3.stroke({ color: 0x222b5e, width: 1.5 });
    this.addChild(cap3);

    const ipsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#2ecc71',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
    });
    this._ipsText = new Text({ text: '+0/сек', style: ipsStyle });
    this._ipsText.anchor.set(0, 0.5);
    this._ipsText.position.set(cap3X + 16, capY + capH / 2);
    this.addChild(this._ipsText);

    const upArrowIcon = UIUtils.createUpArrowIcon(8);
    upArrowIcon.position.set(cap3X + cap3W - 20, capY + capH / 2);
    this.addChild(upArrowIcon);
  }

  update(coins, gems, incomePerSecond) {
    if (this._coinsText) {
      this._coinsText.text = Math.floor(coins || 0).toLocaleString('ru-RU');
    }
    if (this._gemsText) {
      this._gemsText.text = String(gems || 0);
    }
    if (this._ipsText) {
      this._ipsText.text = `+${Math.floor(incomePerSecond || 0).toLocaleString('ru-RU')}/сек`;
    }
  }
}
