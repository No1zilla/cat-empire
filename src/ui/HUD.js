import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';

/**
 * Премиальный HUD AAA-уровня
 */
export class HUD extends Container {
  constructor(app, onOpenCollection, onOpenMenu) {
    super();
    this.app = app;
    this.onOpenCollection = onOpenCollection || (() => {});
    this.onOpenMenu = onOpenMenu || (() => {});
    this._coinsText = null;
    this._gemsText = null;
    this._ipsText = null;
    this._gemIcon = null;

    this._draw();
  }

  _draw() {
    this.removeChildren();
    const hudWidth = CONFIG.GAME_WIDTH || 375;
    const hudHeight = 54;

    // 1. Главная плашка шапки
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill(0x0e0a26);
    this.addChild(bg);

    const capH = 34;
    const capY = 10;
    const capRadius = 14;
    const font = CONFIG.FONT_FAMILY || 'Fredoka, sans-serif';

    // Вспомогательный хелпер для рисования 3D-капсулы с глянцем
    const createCapsuleBg = (x, y, w, h) => {
      const cContainer = new Container();

      const cShadow = new Graphics();
      cShadow.roundRect(x, y + 2, w, h, capRadius);
      cShadow.fill({ color: 0x000000, alpha: 0.35 });
      cContainer.addChild(cShadow);

      const cBg = new Graphics();
      cBg.roundRect(x, y, w, h, capRadius);
      cBg.fill(0x1f1a42);
      cBg.stroke({ color: 0x3c3475, width: 1.5 });
      cContainer.addChild(cBg);

      const shine = new Graphics();
      shine.roundRect(x + 2, y + 2, w - 4, 12, 10);
      shine.fill({ color: 0xffffff, alpha: 0.12 });
      cContainer.addChild(shine);

      return cContainer;
    };

    // 2. КАПСУЛА 1: Монеты (Слева: W = 115px, X = 6px)
    const cap1X = 6;
    const cap1W = 115;
    this.addChild(createCapsuleBg(cap1X, capY, cap1W, capH));

    const coinIcon = UIUtils.createCoinIcon(10);
    coinIcon.position.set(cap1X + 14, capY + capH / 2);
    this.addChild(coinIcon);

    const coinsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.anchor.set(0, 0.5);
    this._coinsText.position.set(cap1X + 28, capY + capH / 2);
    this.addChild(this._coinsText);

    // 3. КАПСУЛА 2: Гемы (W = 75px, X = 126px)
    const cap2X = 126;
    const cap2W = 75;
    this.addChild(createCapsuleBg(cap2X, capY, cap2W, capH));

    this._gemIcon = UIUtils.createGemIcon(10);
    this.addChild(this._gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.anchor.set(0, 0.5);
    this.addChild(this._gemsText);

    this._repositionGemContent();

    // 4. КАПСУЛА 3: Доход в секунду (W = 105px, X = 206px)
    const cap3X = 206;
    const cap3W = 105;
    this.addChild(createCapsuleBg(cap3X, capY, cap3W, capH));

    const ipsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#2ecc71',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._ipsText = new Text({ text: '+0/с', style: ipsStyle });
    this._ipsText.anchor.set(0, 0.5);
    this._ipsText.position.set(cap3X + 10, capY + capH / 2);
    this.addChild(this._ipsText);

    // 5. КНОПКА «🏠» (Вернуться в Главное Меню по п. 4.2.10)
    const menuBtnX = 317;
    const menuBtnW = 52;
    const menuBtnContainer = new Container();
    menuBtnContainer.position.set(menuBtnX, capY);

    const menuBg = new Graphics();
    menuBg.roundRect(0, 0, menuBtnW, capH, capRadius);
    menuBg.fill(0x8e44ad);
    menuBg.stroke({ color: 0x9b59b6, width: 1.5 });
    menuBtnContainer.addChild(menuBg);

    const menuText = new Text({
      text: '🏠',
      style: new TextStyle({ fontSize: 16, align: 'center' })
    });
    menuText.anchor.set(0.5);
    menuText.position.set(menuBtnW / 2, capH / 2);
    menuBtnContainer.addChild(menuText);

    menuBtnContainer.eventMode = 'static';
    menuBtnContainer.cursor = 'pointer';
    menuBtnContainer.on('pointerdown', () => this.onOpenMenu());

    this.addChild(menuBtnContainer);
  }

  _repositionGemContent() {
    if (!this._gemsText || !this._gemIcon) return;
    const cap2W = 90;
    const cap2X = 170;
    const capY = 10;
    const capH = 34;

    const iconW = 16;
    const gap = 6;
    const totalW = iconW + gap + this._gemsText.width;
    const startX = cap2X + (cap2W - totalW) / 2;

    this._gemIcon.position.set(startX + iconW / 2, capY + capH / 2);
    this._gemsText.position.set(startX + iconW + gap, capY + capH / 2);
  }

  update(coins, gems, incomePerSecond) {
    if (this._coinsText) {
      this._coinsText.text = Math.floor(coins || 0).toLocaleString('ru-RU');
    }
    if (this._gemsText) {
      this._gemsText.text = String(gems || 0);
      this._repositionGemContent();
    }
    if (this._ipsText) {
      this._ipsText.text = `+${Math.floor(incomePerSecond || 0).toLocaleString('ru-RU')}/сек`;
    }
  }
}
