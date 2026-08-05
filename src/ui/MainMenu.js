import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';

/**
 * Главное Стартовое Меню (Соответствие правилу 4.2.10 VK Mini Apps)
 */
export class MainMenu extends Container {
  constructor(app, { onPlay, onOpenCollection, onOpenSettings }) {
    super();
    this.app = app;
    this.onPlay = onPlay || (() => {});
    this.onOpenCollection = onOpenCollection || (() => {});
    this.onOpenSettings = onOpenSettings || (() => {});

    this._tickerCallback = null;
    this.eventMode = 'static';
    this._draw();
  }

  _draw() {
    this.removeChildren();
    const width = CONFIG.GAME_WIDTH || 375;
    const height = CONFIG.GAME_HEIGHT || 667;

    // 1. Тёмный фон в стиле глянцевого космического фиолета
    const bg = new Graphics();
    bg.rect(0, 0, width, height);
    bg.fill(0x0e0a26);
    this.addChild(bg);

    // 2. Глянцевое свечение в центре
    const glow = new Graphics();
    glow.circle(width / 2, height / 2 - 40, 160);
    glow.fill({ color: 0x8e44ad, alpha: 0.25 });
    this.addChild(glow);

    const font = CONFIG.FONT_FAMILY || 'Fredoka, sans-serif';

    // 3. Заголовок "👑 ИМПЕРИЯ КОТИКОВ"
    const titleStyle = new TextStyle({
      fontFamily: font,
      fontSize: 28,
      fontWeight: 'bold',
      fill: ['#fff', '#ffd700'],
      fillGradientStops: [0, 1],
      dropShadow: { color: '#000000', alpha: 0.8, blur: 6, distance: 3 },
      align: 'center'
    });

    const title = new Text({ text: '👑 ИМПЕРИЯ КОТИКОВ 👑', style: titleStyle });
    title.anchor.set(0.5);
    title.position.set(width / 2, 110);
    this.addChild(title);

    const subTitleStyle = new TextStyle({
      fontFamily: font,
      fontSize: 14,
      fill: '#a29bfe',
      letterSpacing: 1
    });

    const subTitle = new Text({ text: 'Идл Мёрдж Королевство', style: subTitleStyle });
    subTitle.anchor.set(0.5);
    subTitle.position.set(width / 2, 145);
    this.addChild(subTitle);

    // 4. Маскот — Анимированный Королевский Кот в центре
    const mascotContainer = new Container();
    mascotContainer.position.set(width / 2, 250);

    const mascotBg = new Graphics();
    mascotBg.circle(0, 0, 70);
    mascotBg.fill({ color: 0x1f1a42, alpha: 0.8 });
    mascotBg.stroke({ color: 0x9b59b6, width: 3 });
    mascotContainer.addChild(mascotBg);

    const mascotText = new Text({
      text: '🐱👑',
      style: new TextStyle({ fontSize: 64, align: 'center' })
    });
    mascotText.anchor.set(0.5);
    mascotContainer.addChild(mascotText);

    this.addChild(mascotContainer);

    // Плавная анимация покачивания маскота (Idle bounce)
    let elapsed = 0;
    this._tickerCallback = (ticker) => {
      elapsed += ticker.deltaTime * 0.05;
      mascotContainer.y = 250 + Math.sin(elapsed) * 8;
      mascotContainer.scale.set(1 + Math.sin(elapsed * 1.5) * 0.03);
    };
    this.app.ticker.add(this._tickerCallback);

    // 5. Кнопка «▶️ ИГРАТЬ» (Большая зелёная сочная кнопка)
    const btnW = 240;
    const btnH = 56;
    const btnX = (width - btnW) / 2;

    const playBtn = UIUtils.createButton(
      btnX,
      360,
      btnW,
      btnH,
      '▶️ ИГРАТЬ',
      0x2ecc71,
      () => this.onPlay()
    );
    this.addChild(playBtn);

    // 6. Кнопка «📖 КОТОПЕДИЯ»
    const deckBtn = UIUtils.createButton(
      btnX,
      432,
      btnW,
      48,
      '📖 КОТОПЕДИЯ',
      0x3498db,
      () => this.onOpenCollection()
    );
    this.addChild(deckBtn);

    // 7. Кнопка «⚙️ НАСТРОЙКИ»
    const settingsBtn = UIUtils.createButton(
      btnX,
      494,
      btnW,
      48,
      '⚙️ НАСТРОЙКИ',
      0x8e44ad,
      () => this.onOpenSettings()
    );
    this.addChild(settingsBtn);

    // 8. Футер с версией
    const footerStyle = new TextStyle({
      fontFamily: font,
      fontSize: 11,
      fill: '#7f8c8d'
    });
    const footer = new Text({ text: 'v1.0.0 • VK Mini Apps', style: footerStyle });
    footer.anchor.set(0.5);
    footer.position.set(width / 2, height - 30);
    this.addChild(footer);
  }

  destroy(options) {
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback);
      this._tickerCallback = null;
    }
    super.destroy(options);
  }
}
