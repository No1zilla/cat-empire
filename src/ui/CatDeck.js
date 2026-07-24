import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

/**
 * Горизонтальная интерактивная карусель «Колода карт» прямо на главном экране.
 */
export class CatDeck extends Container {
  constructor(app, maxUnlockedLevel = 1, onCardClick) {
    super();
    this.app = app;
    this.maxUnlockedLevel = Math.max(1, Math.min(15, maxUnlockedLevel || 1));
    this.onCardClick = onCardClick || (() => {});
    this._cardsContainer = null;
    this._dragStartX = 0;
    this._containerStartX = 0;
    this._isDragging = false;

    this._draw();
  }

  _draw() {
    this.removeChildren();

    const W = CONFIG.GAME_WIDTH;
    const deckH = 125;

    // 1. Прозрачный фон секции колоды
    const bg = new Graphics();
    bg.roundRect(10, 0, W - 20, deckH, 14);
    bg.fill({ color: 0x16213e, alpha: 0.85 });
    bg.stroke({ color: CONFIG.COLORS.CELL_BORDER || '#533483', width: 1.5 });
    this.addChild(bg);

    // 2. Заголовок "🃏 Колода котиков (Открыто N/15)"
    const titleStyle = new TextStyle({
      fontSize: 13,
      fontWeight: 'bold',
      fill: CONFIG.COLORS.GOLD || '#ffd700',
    });
    const titleText = new Text({
      text: `🃏 Колода котиков (${this.maxUnlockedLevel}/15)`,
      style: titleStyle
    });
    titleText.position.set(22, 8);
    this.addChild(titleText);

    // Подсказка «Прокручивай»
    const hintStyle = new TextStyle({ fontSize: 11, fill: '#8899aa' });
    const hintText = new Text({ text: 'Прокручивай ➔', style: hintStyle });
    hintText.anchor.set(1, 0);
    hintText.position.set(W - 22, 9);
    this.addChild(hintText);

    // 3. Маскированный прокручиваемый контейнер для карточек
    const mask = new Graphics();
    mask.rect(15, 28, W - 30, 90);
    mask.fill(0xffffff);
    this.addChild(mask);

    this._cardsContainer = new Container();
    this._cardsContainer.mask = mask;
    this.addChild(this._cardsContainer);

    const cardW = 54;
    const cardH = 78;
    const padX = 8;
    const startX = 20;

    for (let level = 1; level <= 15; level++) {
      const isUnlocked = level <= this.maxUnlockedLevel;
      const catData = getCatData(level);
      const x = startX + (level - 1) * (cardW + padX);
      const y = 32;

      const cardGroup = new Container();
      cardGroup.position.set(x, y);

      const cardBg = new Graphics();
      cardBg.roundRect(0, 0, cardW, cardH, 8);

      if (isUnlocked) {
        cardBg.fill(catData.color);
        // Золотая рамка для самого высшего открытого уровня
        if (level === this.maxUnlockedLevel) {
          cardBg.stroke({ color: '#ffd700', width: 2.5 });
        } else {
          cardBg.stroke({ color: '#ffffff', alpha: 0.4, width: 1.5 });
        }
      } else {
        cardBg.fill(0x0f172a);
        cardBg.stroke({ color: 0x334155, width: 1 });
      }
      cardGroup.addChild(cardBg);

      if (isUnlocked) {
        const texture = getCatTexture(level);
        if (texture) {
          const sprite = new Sprite(texture);
          const sSize = 44;
          sprite.width = sSize;
          sprite.height = sSize;
          sprite.x = (cardW - sSize) / 2;
          sprite.y = 4;
          cardGroup.addChild(sprite);
        } else {
          const emojiStyle = new TextStyle({ fontSize: 24 });
          const emoji = new Text({ text: catData.emoji, style: emojiStyle });
          emoji.anchor.set(0.5, 0.5);
          emoji.position.set(cardW / 2, 26);
          cardGroup.addChild(emoji);
        }

        // Lvl N
        const lvlStyle = new TextStyle({ fontSize: 9, fontWeight: 'bold', fill: '#ffffff' });
        const lvlText = new Text({ text: `Lvl ${level}`, style: lvlStyle });
        lvlText.anchor.set(0.5, 0);
        lvlText.position.set(cardW / 2, 52);
        cardGroup.addChild(lvlText);

        // Доход
        const incStyle = new TextStyle({ fontSize: 8, fontWeight: 'bold', fill: '#2ecc71' });
        const incText = new Text({ text: `+${catData.income}`, style: incStyle });
        incText.anchor.set(0.5, 0);
        incText.position.set(cardW / 2, 64);
        cardGroup.addChild(incText);
      } else {
        const lockStyle = new TextStyle({ fontSize: 22 });
        const lockText = new Text({ text: '❓', style: lockStyle });
        lockText.anchor.set(0.5, 0.5);
        lockText.position.set(cardW / 2, 32);
        cardGroup.addChild(lockText);

        const secretStyle = new TextStyle({ fontSize: 8, fill: '#64748b' });
        const secretText = new Text({ text: `Lvl ${level}`, style: secretStyle });
        secretText.anchor.set(0.5, 0);
        secretText.position.set(cardW / 2, 58);
        cardGroup.addChild(secretText);
      }

      cardGroup.eventMode = 'static';
      cardGroup.cursor = 'pointer';
      cardGroup.on('pointerdown', () => {
        if (typeof this.onCardClick === 'function') {
          this.onCardClick(level, isUnlocked);
        }
      });

      this._cardsContainer.addChild(cardGroup);
    }

    // 4. Перетаскивание/скролл свайпом
    this.eventMode = 'static';
    const totalContentW = startX + 15 * (cardW + padX) + 10;
    const minX = Math.min(0, W - 30 - totalContentW);

    this.on('pointerdown', (e) => {
      this._isDragging = true;
      this._dragStartX = e.global.x;
      this._containerStartX = this._cardsContainer.x;
    });

    this.on('pointermove', (e) => {
      if (!this._isDragging) return;
      const dx = e.global.x - this._dragStartX;
      let newX = this._containerStartX + dx;
      newX = Math.max(minX, Math.min(0, newX));
      this._cardsContainer.x = newX;
    });

    const stopDrag = () => { this._isDragging = false; };
    this.on('pointerup', stopDrag);
    this.on('pointerupoutside', stopDrag);
  }

  updateMaxLevel(newMaxLevel) {
    this.maxUnlockedLevel = Math.max(1, Math.min(15, newMaxLevel || 1));
    this._draw();
  }
}

export default CatDeck;
