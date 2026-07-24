import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

/**
 * TASK-009: Туториал первого запуска — 3 шага поверх игры.
 * Показывается один раз; после прохождения ставит флаг в localStorage.
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
        text: 'Нажми кнопку\n«Купить котика»,\nчтобы добавить\nкотика на поле.',
        highlightTarget: 'button',
        handStartX: 200, handStartY: 570,
        handEndX:   200, handEndY:   630,
      },
      {
        title: '🔀 Перетаскивай!',
        text: 'Возьми котика\nи перетащи его\nна другого такого\nже котика.',
        highlightTarget: 'grid',
        handStartX: 120, handStartY: 260,
        handEndX:   200, handEndY:   260,
      },
      {
        title: '✨ Они объединились!',
        text: 'Два одинаковых\nкотика сливаются\nв одного более\nсильного!',
        highlightTarget: 'center',
        handStartX: 200, handStartY: 350,
        handEndX:   200, handEndY:   290,
      }
    ];

    this._showStep(0);
  }

  _showStep(stepIndex) {
    // Отменить предыдущую анимацию руки
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

    // 1. Тёмный overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.72 });
    this.addChild(overlay);

    // 2. Spotlight (подсвеченная зона)
    const spotlight = new Graphics();
    if (step.highlightTarget === 'button') {
      spotlight.roundRect(60, 610, 280, 55, 12);
    } else if (step.highlightTarget === 'grid') {
      spotlight.roundRect(25, 115, 350, 350, 16);
    } else {
      spotlight.circle(200, 290, 80);
    }
    spotlight.fill({ color: 0xffffff, alpha: 0.12 });
    spotlight.stroke({ color: 0xffd700, width: 2, alpha: 0.9 });
    this.addChild(spotlight);

    // 3. Карточка с подсказкой
    const cardY = stepIndex === 1 ? 470 : 420;
    const cardH = stepIndex === 1 ? 155 : 175;

    const card = new Graphics();
    card.roundRect(30, cardY, 340, cardH, 16);
    card.fill(CONFIG.COLORS.GRID_BG || 0x16213e);
    card.stroke({ color: CONFIG.COLORS.ACCENT || 0xe94560, width: 2 });
    this.addChild(card);

    // Заголовок
    const titleStyle = new TextStyle({
      fontSize: 18, fontWeight: 'bold', fill: '#ffffff', align: 'center'
    });
    const titleText = new Text({ text: step.title, style: titleStyle });
    titleText.anchor.set(0.5, 0);
    titleText.x = W / 2;
    titleText.y = cardY + 18;
    this.addChild(titleText);

    // Описание
    const descStyle = new TextStyle({
      fontSize: 14, fill: '#cccccc', align: 'center', lineHeight: 20
    });
    const descText = new Text({ text: step.text, style: descStyle });
    descText.anchor.set(0.5, 0);
    descText.x = W / 2;
    descText.y = cardY + 52;
    this.addChild(descText);

    // 4. Кнопка «Понятно!»
    const btnY = cardY + cardH - 50;
    const btnBg = new Graphics();
    btnBg.roundRect(110, btnY, 180, 38, 10);
    btnBg.fill(CONFIG.COLORS.ACCENT || 0xe94560);
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';
    btnBg.on('pointerdown', () => this._showStep(stepIndex + 1));
    btnBg.on('pointerover', () => { btnBg.alpha = 0.8; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1.0; });
    this.addChild(btnBg);

    const btnStyle = new TextStyle({
      fontSize: 15, fontWeight: 'bold', fill: '#ffffff', align: 'center'
    });
    const btnText = new Text({ text: 'Понятно! →', style: btnStyle });
    btnText.anchor.set(0.5, 0.5);
    btnText.x = 200;
    btnText.y = btnY + 19;
    btnText.eventMode = 'none';
    this.addChild(btnText);

    // 5. Анимированная рука 👆
    const handStyle = new TextStyle({ fontSize: 32 });
    const hand = new Text({ text: '👆', style: handStyle });
    hand.anchor.set(0.5, 0.5);
    hand.x = step.handStartX;
    hand.y = step.handStartY;
    this.addChild(hand);

    const period = 1200;
    const handStart = performance.now();
    const animHand = (now) => {
      const t = ((now - handStart) % period) / period; // 0..1
      const ease = Math.sin(t * Math.PI); // 0→1→0
      hand.x = step.handStartX + (step.handEndX - step.handStartX) * ease;
      hand.y = step.handStartY + (step.handEndY - step.handStartY) * ease;
      this._handRaf = requestAnimationFrame(animHand);
    };
    this._handRaf = requestAnimationFrame(animHand);

    // 6. Точки-индикаторы шагов
    for (let i = 0; i < this.steps.length; i++) {
      const dotStyle = new TextStyle({
        fontSize: 14,
        fill: i === stepIndex ? (CONFIG.COLORS.ACCENT || '#e94560') : '#555555'
      });
      const dot = new Text({ text: '●', style: dotStyle });
      dot.anchor.set(0.5, 0.5);
      dot.x = W / 2 - 20 + i * 20;
      dot.y = cardY + cardH - 12;
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
