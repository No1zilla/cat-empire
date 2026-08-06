import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';

// TASK-015: Модальное окно оффлайн-дохода с пружинящей анимацией появления
export class OfflineModal extends Container {
  constructor(app, earnedCoins, onClose) {
    super();
    this.app = app;
    this.earnedCoins = earnedCoins || 0;
    this.onClose = onClose || (() => {});

    this.eventMode = 'static';
    this._draw();
    this._playPopInAnimation();
  }

  _playPopInAnimation() {
    this.scale.set(0.75);
    this.alpha = 0.5;
    const startAnim = performance.now();
    const popIn = () => {
      if (this.destroyed) return;
      const elapsed = performance.now() - startAnim;
      if (elapsed < 180) {
        const p = elapsed / 180;
        this.scale.set(0.75 + p * 0.3);
        this.alpha = 0.5 + p * 0.5;
      } else if (elapsed < 300) {
        const p = (elapsed - 180) / 120;
        this.scale.set(1.05 - p * 0.05);
        this.alpha = 1.0;
      } else {
        this.scale.set(1.0);
        this.alpha = 1.0;
        return;
      }
      requestAnimationFrame(popIn);
    };
    requestAnimationFrame(popIn);
  }

  // Отрисовка элементов модального окна
  _draw() {
    // 1. Полупрозрачный оверлей (едиственный тон с другими модальными окнами)
    const overlay = new Graphics();
    overlay.rect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    overlay.on('pointerup', (e) => e.stopPropagation());
    overlay.on('pointertap', (e) => e.stopPropagation());
    this.addChild(overlay);

    // 2. Карточка модального окна по центру
    const cardWidth = 300;
    const cardHeight = 240;
    const cardX = (CONFIG.GAME_WIDTH - cardWidth) / 2;
    const cardY = (CONFIG.GAME_HEIGHT - cardHeight) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
    card.fill(0x15102A);  // TOKENS.panelBg — единый фон
    card.stroke({ color: 0xff6b6b, width: 2.5 });
    this.addChild(card);

    // 3. Заголовок
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
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

    // Кнопка закрытия ✕
    const closeBtnStyle = new TextStyle({ fontSize: 18, fill: '#aaaaaa', fontWeight: 'bold' });
    const closeBtn = new Text({ text: '✕', style: closeBtnStyle });
    closeBtn.anchor.set(0.5, 0.5);
    closeBtn.position.set(cardX + cardWidth - 20, cardY + 20);
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    this.addChild(closeBtn);

    // 4. Большая иконка монеты
    const coinIcon = UIUtils.createCoinIcon(24, true);
    coinIcon.position.set(CONFIG.GAME_WIDTH / 2, cardY + 95);
    this.addChild(coinIcon);

    // 5. Текст суммы заработка
    const earnedStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 22,
      fontWeight: 'bold',
      fill: CONFIG.COLORS.GOLD || '#ffd700',
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
    btnBg.roundRect(0, 0, btnWidth, btnHeight, 14);
    btnBg.fill(0xFF6B6B);  // TOKENS.btnBuy — единый акцентный цвет
    btnBg.stroke({ color: '#ffffff', alpha: 0.4, width: 1.5 });
    buttonGroup.addChild(btnBg);

    const btnStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
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
      buttonGroup.scale.set(0.94);
      setTimeout(() => {
        this._close();
      }, 100);
    });

    buttonGroup.on('pointerover', () => { buttonGroup.alpha = 0.88; });
    buttonGroup.on('pointerout',  () => { buttonGroup.alpha = 1.0; });

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
