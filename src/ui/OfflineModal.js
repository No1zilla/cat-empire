import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

// Модальное окно начисления оффлайн-дохода "Пока тебя не было..."
export class OfflineModal extends Container {
  constructor(app, earnedCoins, onClose) {
    super();
    this.app = app;
    this.earnedCoins = earnedCoins || 0;
    this.onClose = onClose || (() => {});

    this._draw();
  }

  // Отрисовка элементов модального окна
  _draw() {
    // 1. Полупрозрачный затемняющий оверлей на весь экран
    const overlay = new Graphics();
    overlay.rect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    overlay.eventMode = 'static'; // блокирует клики сквозь оверлей
    this.addChild(overlay);

    // 2. Карточка модального окна по центру
    const cardWidth = 300;
    const cardHeight = 240;
    const cardX = (CONFIG.GAME_WIDTH - cardWidth) / 2;
    const cardY = (CONFIG.GAME_HEIGHT - cardHeight) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
    card.fill(CONFIG.COLORS.GRID_BG);
    card.stroke({ color: CONFIG.COLORS.ACCENT, width: 2 });
    this.addChild(card);

    // 3. Заголовок
    const titleStyle = new TextStyle({
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const title = new Text({
      text: '😴 Пока тебя не было...',
      style: titleStyle
    });
    title.anchor.set(0.5, 0);
    title.position.set(CONFIG.GAME_WIDTH / 2, cardY + 20);
    this.addChild(title);

    // 4. Большая иконка монеты 🪙
    const coinIconStyle = new TextStyle({ fontSize: 48 });
    const coinIcon = new Text({
      text: '🪙',
      style: coinIconStyle
    });
    coinIcon.anchor.set(0.5, 0.5);
    coinIcon.position.set(CONFIG.GAME_WIDTH / 2, cardY + 95);
    this.addChild(coinIcon);

    // 5. Текст суммы заработка
    const earnedStyle = new TextStyle({
      fontSize: 22,
      fontWeight: 'bold',
      fill: CONFIG.COLORS.GOLD,
      align: 'center'
    });
    const earnedText = new Text({
      text: `+${Math.floor(this.earnedCoins).toLocaleString('ru-RU')} монет`,
      style: earnedStyle
    });
    earnedText.anchor.set(0.5, 0.5);
    earnedText.position.set(CONFIG.GAME_WIDTH / 2, cardY + 140);
    this.addChild(earnedText);

    // 6. Кнопка «Забрать!»
    const btnWidth = 200;
    const btnHeight = 45;
    const btnX = (CONFIG.GAME_WIDTH - btnWidth) / 2;
    const btnY = cardY + 175;

    const buttonGroup = new Container();
    buttonGroup.position.set(btnX, btnY);

    const btnBg = new Graphics();
    btnBg.roundRect(0, 0, btnWidth, btnHeight, 12);
    btnBg.fill(CONFIG.COLORS.ACCENT);
    buttonGroup.addChild(btnBg);

    const btnStyle = new TextStyle({
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const btnText = new Text({
      text: '👛 Забрать!',
      style: btnStyle
    });
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(btnWidth / 2, btnHeight / 2);
    buttonGroup.addChild(btnText);

    // Интерактивность кнопки
    buttonGroup.eventMode = 'static';
    buttonGroup.cursor = 'pointer';

    buttonGroup.on('pointerdown', () => {
      buttonGroup.alpha = 0.8;
      this._close();
    });

    buttonGroup.on('pointerover', () => {
      buttonGroup.alpha = 0.85;
    });

    buttonGroup.on('pointerout', () => {
      buttonGroup.alpha = 1.0;
    });

    this.addChild(buttonGroup);
  }

  // Закрытие модального окна
  _close() {
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
    this.destroy({ children: true });
  }
}

export default OfflineModal;
