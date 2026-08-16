import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';

/**
 * Премиальный HUD AAA-уровня с подключением TOKENS (TASK-047)
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
    const hudWidth = CONFIG.GAME_WIDTH || 410;
    const hudHeight = 54;

    // 1. Главная плашка шапки (использование токена background)
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill(parseInt(TOKENS.colors.background.replace('#', '0x')));
    this.addChild(bg);

    const capH = 34;
    const capY = 10;
    const capRadius = TOKENS.radii.hud || 14;
    const font = CONFIG.FONT_FAMILY || 'Fredoka, sans-serif';

    // Вспомогательный хелпер для рисования 3D-капсулы с токенами
    const createCapsuleBg = (x, y, w, h) => {
      const cContainer = new Container();

      const cShadow = new Graphics();
      cShadow.roundRect(x, y + 2, w, h, capRadius);
      cShadow.fill({ color: 0x000000, alpha: 0.35 });
      cContainer.addChild(cShadow);

      const cBg = new Graphics();
      cBg.roundRect(x, y, w, h, capRadius);
      cBg.fill(parseInt(TOKENS.colors.panelBg.replace('#', '0x')));
      cBg.stroke({ color: parseInt(TOKENS.colors.panelBorder.replace('#', '0x')), width: 1.5 });
      cContainer.addChild(cBg);

      const shine = new Graphics();
      shine.roundRect(x + 2, y + 2, w - 4, 12, 10);
      shine.fill({ color: 0xffffff, alpha: 0.12 });
      cContainer.addChild(shine);

      return cContainer;
    };

    // Симметричный расчёт позиций HUD точно по краям игрового поля (409px)
    // Левый край поля = 0px, правый = 409px. 
    // Отступы по краям делаем одинаковыми по 5px:
    const cap1X = 5;
    const cap1W = 128; // 🪙 Монеты (5..133)

    const cap2X = 139;
    const cap2W = 60;  // рубины (139..199)

    const cap3X = 205;
    const cap3W = 128; // 📈 Доход (205..333)

    const menuBtnX = 339;
    const menuBtnW = 65; // 🐾 Меню (339..404 -> ровно 5px до края 409px!)

    this._cap1X = cap1X;
    this._cap1W = cap1W;

    // 2. КАПСУЛА 1: Монеты
    this.addChild(createCapsuleBg(cap1X, capY, cap1W, capH));

    this._coinIcon = UIUtils.createCoinIcon(10);
    this.addChild(this._coinIcon);

    const coinsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._coinsText = new Text({ text: '100', style: coinsStyle });
    this._coinsText.anchor.set(0, 0.5);
    this.addChild(this._coinsText);
    this._repositionCoinContent();

    // 3. КАПСУЛА 2: Рубины
    this.addChild(createCapsuleBg(cap2X, capY, cap2W, capH));

    this._gemIcon = UIUtils.createGemIcon(10);
    this.addChild(this._gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._gemsText = new Text({ text: '10', style: gemsStyle });
    this._gemsText.anchor.set(0, 0.5);
    this.addChild(this._gemsText);

    this._cap2X = cap2X;
    this._cap2W = cap2W;
    this._repositionGemContent();

    // 4. КАПСУЛА 3: Доход в секунду
    this.addChild(createCapsuleBg(cap3X, capY, cap3W, capH));

    const ipsStyle = new TextStyle({
      fontFamily: font,
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._ipsText = new Text({ text: '+0/сек', style: ipsStyle });
    this._ipsText.anchor.set(0.5, 0.5);
    this._ipsText.position.set(cap3X + cap3W / 2, capY + capH / 2);
    this.addChild(this._ipsText);

    // 5. КНОПКА «🐾» Меню (auto-positioned)
    const menuBtnContainer = new Container();
    menuBtnContainer.position.set(menuBtnX, capY);

    const menuBg = new Graphics();
    menuBg.roundRect(0, 0, menuBtnW, capH, capRadius);
    menuBg.fill(0x8e44ad);
    menuBg.stroke({ color: 0x9b59b6, width: 1.5 });
    menuBtnContainer.addChild(menuBg);

    const menuShine = new Graphics();
    menuShine.roundRect(2, 2, menuBtnW - 4, 12, 10);
    menuShine.fill({ color: 0xffffff, alpha: 0.15 });
    menuBtnContainer.addChild(menuShine);

    const catPawIcon = UIUtils.createCatPawIcon(10);
    catPawIcon.position.set(menuBtnW / 2, capH / 2 - 1);
    menuBtnContainer.addChild(catPawIcon);

    menuBtnContainer.eventMode = 'static';
    menuBtnContainer.cursor = 'pointer';
    menuBtnContainer.hitArea = new Rectangle(-5, -5, menuBtnW + 10, capH + 10);

    let lastMenuTapTime = 0;
    const handleMenuTrigger = (e) => {
      const now = Date.now();
      if (now - lastMenuTapTime < 300) return;
      lastMenuTapTime = now;

      if (e) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.preventDefault === 'function') e.preventDefault();
      }
      menuBtnContainer.alpha = 0.6;
      setTimeout(() => {
        if (!menuBtnContainer.destroyed) menuBtnContainer.alpha = 1.0;
      }, 120);

      console.log('🐾 [HUD ARCHITECTURE] Menu button triggered!');
      this.onOpenMenu();
    };

    menuBtnContainer.on('pointertap', handleMenuTrigger);
    menuBtnContainer.on('pointerdown', (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    });

    this.addChild(menuBtnContainer);
  }

  showMenuOverlay() {}
  hideMenuOverlay() {}

  _formatShortNumber(num) {
    return UIUtils.formatNumber(num);
  }

  _repositionCoinContent() {
    if (!this._coinsText || !this._coinIcon) return;
    const cap1X = this._cap1X || 10;
    const cap1W = this._cap1W || 126;
    const capY = 10;
    const capH = 34;

    const iconW = 14;
    const gap = 5;
    const totalW = iconW + gap + this._coinsText.width;
    const startX = cap1X + Math.max(4, (cap1W - totalW) / 2);

    this._coinIcon.position.set(startX + iconW / 2, capY + capH / 2);
    this._coinsText.position.set(startX + iconW + gap, capY + capH / 2);
  }

  _repositionGemContent() {
    if (!this._gemsText || !this._gemIcon) return;
    const cap2W = this._cap2W || 60;
    const cap2X = this._cap2X || 145;
    const capY = 10;
    const capH = 34;

    const iconW = 14;
    const gap = 4;
    const totalW = iconW + gap + this._gemsText.width;
    const startX = cap2X + Math.max(4, (cap2W - totalW) / 2);

    this._gemIcon.position.set(startX + iconW / 2, capY + capH / 2);
    this._gemsText.position.set(startX + iconW + gap, capY + capH / 2);
  }

  update(coins, gems, incomePerSecond) {
    if (this._coinsText) {
      this._coinsText.text = this._formatShortNumber(coins);
      this._repositionCoinContent();
    }
    if (this._gemsText) {
      this._gemsText.text = String(gems || 0);
      this._repositionGemContent();
    }
    if (this._ipsText) {
      this._ipsText.text = `+${this._formatShortNumber(incomePerSecond)}/сек`;
    }
  }
}
