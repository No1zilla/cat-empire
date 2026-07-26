import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

/**
 * TASK-009: Туториал первого запуска — 3 пошаговых экрана с подсветкой элементов.
 */
export class Tutorial extends Container {
  constructor(app, onComplete) {
    super();
    this.app = app;
    this.onComplete = onComplete || (() => {});
    this.currentStep = 0;
    this._handRaf = null;

    this.steps = [
      {
        title: '🐱 Покупай котиков!',
        text: 'Нажми «Купить»,\nчтобы добавить котика.\n💡 Зажмите кнопку для\nбыстрой авто-покупки!',
        highlightTarget: 'button',
        cardY: 240,
        cardH: 185,
        handStartX: 73,  handStartY: 570,
        handEndX:   73,  handEndY:   515,
      },
      {
        title: '🔀 Перетаскивай!',
        text: 'Возьми котика\nи перетащи его\nна другого такого\nже котика.',
        highlightTarget: 'slots',
        cardY: 175,
        cardH: 180,
        handStartX: 42,  handStartY: 105,
        handEndX:   124, handEndY:   105,
      },
      {
        title: '✨ Они объединились!',
        text: 'Два одинаковых\nкотика сливаются\nв одного более\nсильного котика!',
        highlightTarget: 'mergedSlot',
        cardY: 175,
        cardH: 180,
        handStartX: 124, handStartY: 145,
        handEndX:   124, handEndY:   105,
      }
    ];

    this.eventMode = 'static'; // блокирует клики сквозь оверлей
    this._showStep(0);
  }

  _showStep(stepIndex) {
    if (this._handRaf) {
      cancelAnimationFrame(this._handRaf);
      this._handRaf = null;
    }

    this.removeChildren();

    if (stepIndex >= this.steps.length) {
      this._complete();
      return;
    }

    const step = this.steps[stepIndex];
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // 1. Тёмный overlay на весь экран
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.75 });
    overlay.eventMode = 'static';
    this.addChild(overlay);

    // 2. Spotlight (подсвеченная зона под аккуратные координаты)
    const spotlight = new Graphics();
    if (step.highlightTarget === 'button') {
      spotlight.roundRect(12, 483, 122, 50, 14);
    } else if (step.highlightTarget === 'slots') {
      spotlight.roundRect(2, 64, 162, 81, 14);
    } else if (step.highlightTarget === 'mergedSlot') {
      spotlight.roundRect(83, 64, 81, 81, 14);
    } else {
      spotlight.circle(200, 300, 80);
    }
    spotlight.fill({ color: 0xffffff, alpha: 0.15 });
    spotlight.stroke({ color: 0xffd700, width: 2.5, alpha: 0.95 });
    this.addChild(spotlight);

    // 3. Карточка с подсказкой
    const cardY = step.cardY;
    const cardH = step.cardH;

    const card = new Graphics();
    card.roundRect(30, cardY, 340, cardH, 16);
    card.fill(CONFIG.COLORS.GRID_BG || 0x16213e);
    card.stroke({ color: CONFIG.COLORS.ACCENT || 0xe94560, width: 2 });
    this.addChild(card);

    // Заголовок
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18, fontWeight: 'bold', fill: '#ffffff', align: 'center'
    });
    const titleText = new Text({ text: step.title, style: titleStyle });
    titleText.anchor.set(0.5, 0);
    titleText.x = W / 2;
    titleText.y = cardY + 18;
    this.addChild(titleText);

    // Текст описания
    const descStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14, fill: '#cccccc', align: 'center', lineHeight: 20
    });
    const descText = new Text({ text: step.text, style: descStyle });
    descText.anchor.set(0.5, 0);
    descText.x = W / 2;
    descText.y = cardY + 48;
    this.addChild(descText);

    // 4. Кнопка «Пропустить ✕»
    const skipStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#aaaaaa',
      align: 'right'
    });
    const skipText = new Text({ text: 'Пропустить ✕', style: skipStyle });
    skipText.anchor.set(1, 0);
    skipText.position.set(355, cardY + 12);
    skipText.eventMode = 'static';
    skipText.cursor = 'pointer';
    skipText.on('pointerdown', (e) => {
      e.stopPropagation();
      this._complete();
    });
    this.addChild(skipText);

    // 5. Кнопка «Понятно!»
    const btnY = cardY + cardH - 46;
    const btnBg = new Graphics();
    btnBg.roundRect(110, btnY, 180, 36, 10);
    btnBg.fill(CONFIG.COLORS.ACCENT || 0xe94560);
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';
    btnBg.on('pointerdown', (e) => {
      e.stopPropagation();
      this._showStep(stepIndex + 1);
    });
    btnBg.on('pointerover', () => { btnBg.alpha = 0.85; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1.0; });
    this.addChild(btnBg);

    const btnStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 15, fontWeight: 'bold', fill: '#ffffff', align: 'center'
    });
    const btnText = new Text({ text: 'Понятно! →', style: btnStyle });
    btnText.anchor.set(0.5, 0.5);
    btnText.x = 200;
    btnText.y = btnY + 18;
    btnText.eventMode = 'none';
    this.addChild(btnText);

    // 5. Анимированная рука 👆
    const handStyle = new TextStyle({ fontSize: 34 });
    const hand = new Text({ text: '👆', style: handStyle });
    hand.anchor.set(0.5, 0.5);
    hand.x = step.handStartX;
    hand.y = step.handStartY;
    this.addChild(hand);

    const period = 1200;
    const handStart = performance.now();
    const animHand = (now) => {
      const t = ((now - handStart) % period) / period;
      const ease = Math.sin(t * Math.PI);
      hand.x = step.handStartX + (step.handEndX - step.handStartX) * ease;
      hand.y = step.handStartY + (step.handEndY - step.handStartY) * ease;
      this._handRaf = requestAnimationFrame(animHand);
    };
    this._handRaf = requestAnimationFrame(animHand);

    // 6. Точки-индикаторы шагов (●●●)
    for (let i = 0; i < this.steps.length; i++) {
      const dotStyle = new TextStyle({
        fontSize: 14,
        fill: i === stepIndex ? (CONFIG.COLORS.ACCENT || '#e94560') : '#555555'
      });
      const dot = new Text({ text: '●', style: dotStyle });
      dot.anchor.set(0.5, 0.5);
      dot.x = W / 2 - 20 + i * 20;
      dot.y = cardY + cardH - 10;
      this.addChild(dot);
    }
  }

  _complete() {
    if (this._handRaf) {
      cancelAnimationFrame(this._handRaf);
      this._handRaf = null;
    }
    localStorage.setItem('cat_empire_tutorial_done', '1');
    this.onComplete();
    this.destroy({ children: true });
  }
}

export default Tutorial;
