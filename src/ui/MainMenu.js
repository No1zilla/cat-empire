import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { getCatTexture } from '../utils/catTextures.js';

/**
 * Главное Стартовое Меню (Соответствие правилу 4.2.10 VK Mini Apps + TOKENS)
 */
export class MainMenu extends Container {
  constructor(app, {
    onPlay,
    onOpenCollection,
    onOpenSettings,
    onOpenDaily,
    onOpenQuests,
    onOpenLeaderboard,
    onInvite,
    onOpenShop,
    onOpenCourt,
    dailyAvailable = false,
    questsClaimable = 0
  }) {
    super();
    this.app = app;
    this.onPlay = onPlay || (() => {});
    this.onOpenCollection = onOpenCollection || (() => {});
    this.onOpenSettings = onOpenSettings || (() => {});
    this.onOpenDaily = onOpenDaily || (() => {});
    this.onOpenQuests = onOpenQuests || (() => {});
    this.onOpenLeaderboard = onOpenLeaderboard || (() => {});
    this.onInvite = onInvite || (() => {});
    this.onOpenShop = onOpenShop || (() => {});
    this.onOpenCourt = onOpenCourt || (() => {});
    this.dailyAvailable = dailyAvailable;
    this.questsClaimable = questsClaimable;

    this._tickerCallback = null;
    this.eventMode = 'static';
    this._draw();
  }

  _draw() {
    this.removeChildren();
    const width = CONFIG.GAME_WIDTH || 375;
    const height = CONFIG.GAME_HEIGHT || 667;

    // 1. Тёмный фон в едином стиле TOKENS (#0D0A1C)
    const bg = new Graphics();
    bg.rect(0, 0, width, height);
    bg.fill(TOKENS.colors.background);
    this.addChild(bg);

    // 2. Глянцевое свечение в центре
    const glow = new Graphics();
    glow.circle(width / 2, height / 2 - 40, 160);
    glow.fill({ color: 0x3d2375, alpha: 0.35 });
    this.addChild(glow);

    const font = TOKENS.typography.fontFamily;

    // 3. Заголовок "ИМПЕРИЯ КОТИКОВ" (Чистый премиальный шрифт без эмодзи)
    const titleStyle = new TextStyle({
      fontFamily: font,
      fontSize: 30,
      fontWeight: TOKENS.typography.fontWeightBold,
      fill: [TOKENS.colors.textPrimary, TOKENS.colors.gold],
      fillGradientStops: [0, 1],
      dropShadow: { color: '#000000', alpha: 0.7, blur: 5, distance: 2 },
      letterSpacing: 2,
      align: 'center'
    });

    const title = new Text({ text: 'ИМПЕРИЯ КОТИКОВ', style: titleStyle });
    title.anchor.set(0.5);
    title.position.set(width / 2, 72);
    this.addChild(title);

    const subTitleStyle = new TextStyle({
      fontFamily: font,
      fontSize: 13,
      fontWeight: 'bold',
      fill: TOKENS.colors.income,
      letterSpacing: 1.5
    });

    const subTitle = new Text({ text: 'IDLE MERGE KINGDOM', style: subTitleStyle });
    subTitle.anchor.set(0.5);
    subTitle.position.set(width / 2, 102);
    this.addChild(subTitle);

    // 4. Маскот — Анимированный Королевский Кот в центре
    const mascotContainer = new Container();
    mascotContainer.position.set(width / 2, 188);

    const mascotBg = new Graphics();
    mascotBg.circle(0, 0, 72);
    mascotBg.fill({ color: 0x15102A, alpha: 0.95 });
    mascotBg.stroke({ color: 0x271F4F, width: 3 });
    mascotContainer.addChild(mascotBg);

    // Отрисовка реального PNG спрайта Главного Королевского Кота (Lvl 12 Astronaut)
    let catSprite = null;
    const catTex = getCatTexture(12) || getCatTexture(1);
    if (catTex) {
      catSprite = new Sprite(catTex);
      catSprite.anchor.set(0.5);
      catSprite.width = 118;
      catSprite.height = 118;
    } else {
      catSprite = new Text({
        text: '🐱',
        style: new TextStyle({ fontSize: 64, align: 'center' })
      });
      catSprite.anchor.set(0.5);
    }
    mascotContainer.addChild(catSprite);
    this.addChild(mascotContainer);

    // Плавная анимация покачивания маскота (Idle bounce)
    let elapsed = 0;
    this._tickerCallback = (ticker) => {
      elapsed += ticker.deltaTime * 0.05;
      mascotContainer.y = 188 + Math.sin(elapsed) * 8;
      mascotContainer.scale.set(1 + Math.sin(elapsed * 1.5) * 0.03);
    };
    this.app.ticker.add(this._tickerCallback);

    const btnW = 240;
    const halfW = 114;
    const btnX = (width - btnW) / 2;
    const gap = 12;

    const playBtn = UIUtils.createButton(
      btnX,
      278,
      btnW,
      50,
      '▶️ ИГРАТЬ',
      0xFF6B6B,
      () => this.onPlay()
    );
    this.addChild(playBtn);

    const dailyLabel = this.dailyAvailable ? '🎁 ДЕНЬ •' : '🎁 ДЕНЬ';
    const dailyBtn = UIUtils.createButton(
      btnX,
      340,
      halfW,
      44,
      dailyLabel,
      0xFF6B6B,
      () => this.onOpenDaily()
    );
    this.addChild(dailyBtn);
    if (this.dailyAvailable) this._addBadge(dailyBtn, halfW);

    const questLabel = this.questsClaimable > 0 ? `📋 КВЕСТ ${this.questsClaimable}` : '📋 КВЕСТ';
    const questBtn = UIUtils.createButton(
      btnX + halfW + gap,
      340,
      halfW,
      44,
      questLabel,
      0xA55EEA,
      () => this.onOpenQuests()
    );
    this.addChild(questBtn);
    if (this.questsClaimable > 0) this._addBadge(questBtn, halfW);

    const boardBtn = UIUtils.createButton(
      btnX,
      396,
      halfW,
      44,
      '🏆 ТОП',
      0xFF9F43,
      () => this.onOpenLeaderboard()
    );
    this.addChild(boardBtn);

    const inviteBtn = UIUtils.createButton(
      btnX + halfW + gap,
      396,
      halfW,
      44,
      '🤝 ДРУЗЬЯ',
      0x0077FF,
      () => this.onInvite()
    );
    this.addChild(inviteBtn);

    const deckBtn = UIUtils.createButton(
      btnX,
      452,
      halfW,
      44,
      '📖 КОТОПЕДИЯ',
      0xFF9F43,
      () => this.onOpenCollection()
    );
    this.addChild(deckBtn);

    const shopBtn = UIUtils.createButton(
      btnX + halfW + gap,
      452,
      halfW,
      44,
      'РУБИНЫ',
      parseInt(TOKENS.colors.gems.replace('#', '0x')),
      () => this.onOpenShop()
    );
    shopBtn.children.forEach((child) => {
      if (child instanceof Text) child.position.x = halfW / 2 + 8;
    });
    const shopGem = UIUtils.createGemIcon(8);
    shopGem.position.set(22, 22);
    shopBtn.addChild(shopGem);
    this.addChild(shopBtn);

    const courtBtn = UIUtils.createButton(
      btnX,
      508,
      halfW,
      44,
      'ДВОР',
      0x2ecc71,
      () => this.onOpenCourt()
    );
    this.addChild(courtBtn);

    const settingsBtn = UIUtils.createButton(
      btnX + halfW + gap,
      508,
      halfW,
      44,
      '⚙️ НАСТРОЙКИ',
      0xA55EEA,
      () => this.onOpenSettings()
    );
    this.addChild(settingsBtn);

    // 8. Футер с версией
    const footerStyle = new TextStyle({
      fontFamily: font,
      fontSize: 11,
      fill: TOKENS.colors.textMuted
    });
    const footer = new Text({ text: 'v1.0.0 • VK Mini Apps', style: footerStyle });
    footer.anchor.set(0.5);
    footer.position.set(width / 2, height - 30);
    this.addChild(footer);
  }

  _addBadge(button, width) {
    const dot = new Graphics();
    dot.circle(width - 10, 8, 6);
    dot.fill(0xff4757);
    dot.stroke({ color: 0xffffff, width: 1.5 });
    button.addChild(dot);
  }

  destroy(options) {
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback);
      this._tickerCallback = null;
    }
    super.destroy(options);
  }
}
