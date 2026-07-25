import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

/**
 * TASK-015: Переработанная панель «Колода карт» в стиле Glassmorphism со стильными замочками 🔒
 */
export class CatDeck extends Container {
  constructor(app, maxUnlockedLevel = 1, onCardClick) {
    super();
    this.app = app;
    this.maxUnlockedLevel = Math.max(1, Math.min(15, maxUnlockedLevel || 1));
    this.onCardClick = onCardClick || (() => {});

    // Физика и параметры скролла
    this._currentX = 0;
    this._targetX = 0;
    this._velocity = 0;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartTargetX = 0;
    this._isMoved = false;
    this._lastMoveTime = 0;
    this._lastMoveX = 0;
    this._animRaf = null;

    this._draw();
    this._setupEvents();
    this._startSmoothLoop();

    this.scrollToLevel(1);
  }

  _draw() {
    this.removeChildren();

    const W = CONFIG.GAME_WIDTH;
    const deckH = 125;

    // 1. Панель матового стекла (Glassmorphism): полупрозрачная тёмная подложка + белая окантовка alpha 0.18
    const bg = new Graphics();
    bg.roundRect(10, 0, W - 20, deckH, 16);
    bg.fill({ color: 0x110d26, alpha: 0.7 });
    bg.stroke({ color: 0xffffff, alpha: 0.18, width: 1.5 });
    this.addChild(bg);

    // 2. Заголовок "📖 Котопедия (Открыто N/15)"
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: CONFIG.COLORS.GOLD || '#ffd700',
    });
    const titleText = new Text({
      text: `📖 Котопедия (${this.maxUnlockedLevel}/15)`,
      style: titleStyle
    });
    titleText.position.set(22, 8);
    this.addChild(titleText);

    // Подсказка
    const hintStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 10,
      fill: CONFIG.COLORS.TEXT_DIM || '#9ca3af'
    });
    const hintText = new Text({ text: 'Листай ◄ ►', style: hintStyle });
    hintText.anchor.set(1, 0);
    hintText.position.set(W - 40, 9);
    this.addChild(hintText);

    // 3. Зона маскирования (ширина 320px по центру)
    const maskX = 40;
    const maskW = W - 80;
    const mask = new Graphics();
    mask.rect(maskX, 26, maskW, 92);
    mask.fill(0xffffff);
    this.addChild(mask);

    this._cardsContainer = new Container();
    this._cardsContainer.mask = mask;
    this.addChild(this._cardsContainer);

    const cardW = 54;
    const cardH = 78;
    const padX = 8;
    const startX = maskX + 4;

    for (let level = 1; level <= 15; level++) {
      const isUnlocked = level <= this.maxUnlockedLevel;
      const catData = getCatData(level);
      const x = startX + (level - 1) * (cardW + padX);
      const y = 32;

      const cardGroup = new Container();
      cardGroup.position.set(x, y);

      const cardBg = new Graphics();
      cardBg.roundRect(0, 0, cardW, cardH, 10);

      if (isUnlocked) {
        cardBg.fill(catData.color);
        if (level === this.maxUnlockedLevel) {
          cardBg.stroke({ color: '#ffd700', width: 2.5 });
        } else {
          cardBg.stroke({ color: '#ffffff', alpha: 0.5, width: 1.5 });
        }
      } else {
        // Тёмный утонченный слот заблокированного котика
        cardBg.fill(0x18152e);
        cardBg.stroke({ color: 0x332c52, width: 1.5 });
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

        const lvlStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 9,
          fontWeight: 'bold',
          fill: '#ffffff'
        });
        const lvlText = new Text({ text: `Lvl ${level}`, style: lvlStyle });
        lvlText.anchor.set(0.5, 0);
        lvlText.position.set(cardW / 2, 52);
        cardGroup.addChild(lvlText);

        const incStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 8,
          fontWeight: 'bold',
          fill: '#2ecc71'
        });
        const incText = new Text({ text: `+${catData.income}`, style: incStyle });
        incText.anchor.set(0.5, 0);
        incText.position.set(cardW / 2, 64);
        cardGroup.addChild(incText);
      } else {
        // TASK-015: Замена пугающих красных вопросов на стильную иконку замочка 🔒
        const lockStyle = new TextStyle({ fontSize: 20 });
        const lockText = new Text({ text: '🔒', style: lockStyle });
        lockText.anchor.set(0.5, 0.5);
        lockText.position.set(cardW / 2, 32);
        cardGroup.addChild(lockText);

        const secretStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 8,
          fontWeight: 'bold',
          fill: '#6b7280'
        });
        const secretText = new Text({ text: `Lvl ${level}`, style: secretStyle });
        secretText.anchor.set(0.5, 0);
        secretText.position.set(cardW / 2, 58);
        cardGroup.addChild(secretText);
      }

      this._cardsContainer.addChild(cardGroup);
    }

    // 4. Интерактивные стрелки ◀ ▶
    const btnSize = 28;

    const leftBtn = new Graphics();
    leftBtn.roundRect(14, 58, btnSize, btnSize, 8);
    leftBtn.fill({ color: 0x1a1638, alpha: 0.9 });
    leftBtn.stroke({ color: CONFIG.COLORS.ACCENT || '#ff5e62', width: 1.5 });
    leftBtn.eventMode = 'static';
    leftBtn.cursor = 'pointer';
    leftBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.scrollBy(180);
    });
    this.addChild(leftBtn);

    const leftTextStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fill: '#ffffff',
      fontWeight: 'bold'
    });
    const leftIcon = new Text({ text: '◀', style: leftTextStyle });
    leftIcon.anchor.set(0.5, 0.5);
    leftIcon.position.set(14 + btnSize / 2, 58 + btnSize / 2);
    leftIcon.eventMode = 'none';
    this.addChild(leftIcon);

    const rightBtn = new Graphics();
    rightBtn.roundRect(W - 42, 58, btnSize, btnSize, 8);
    rightBtn.fill({ color: 0x1a1638, alpha: 0.9 });
    rightBtn.stroke({ color: CONFIG.COLORS.ACCENT || '#ff5e62', width: 1.5 });
    rightBtn.eventMode = 'static';
    rightBtn.cursor = 'pointer';
    rightBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.scrollBy(-180);
    });
    this.addChild(rightBtn);

    const rightTextStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fill: '#ffffff',
      fontWeight: 'bold'
    });
    const rightIcon = new Text({ text: '▶', style: rightTextStyle });
    rightIcon.anchor.set(0.5, 0.5);
    rightIcon.position.set(W - 42 + btnSize / 2, 58 + btnSize / 2);
    rightIcon.eventMode = 'none';
    this.addChild(rightIcon);
  }

  _setupEvents() {
    this.eventMode = 'static';
    this.cursor = 'grab';

    const cardW = 54;
    const padX = 8;
    const startX = 44;
    const totalW = startX + 15 * (cardW + padX);
    const minX = Math.min(0, (CONFIG.GAME_WIDTH - 80) - totalW);

    this.on('pointerdown', (e) => {
      this._isDragging = true;
      this._isMoved = false;
      this._velocity = 0;
      this._dragStartX = e.global.x;
      this._dragStartTargetX = this._targetX;
      this._lastMoveX = e.global.x;
      this._lastMoveTime = performance.now();
      this.cursor = 'grabbing';
    });

    this.on('pointermove', (e) => {
      if (!this._isDragging) return;
      const dx = e.global.x - this._dragStartX;
      if (Math.abs(dx) > 6) {
        this._isMoved = true;
      }

      const now = performance.now();
      const dt = now - this._lastMoveTime;
      if (dt > 0) {
        this._velocity = (e.global.x - this._lastMoveX) / dt * 15;
        this._lastMoveX = e.global.x;
        this._lastMoveTime = now;
      }

      let newX = this._dragStartTargetX + dx;
      if (newX > 0) newX *= 0.3;
      if (newX < minX) newX = minX + (newX - minX) * 0.3;

      this._targetX = newX;
    });

    const onUp = (e) => {
      if (!this._isDragging) return;
      this._isDragging = false;
      this.cursor = 'grab';

      if (Math.abs(this._velocity) > 1) {
        this._targetX += this._velocity * 8;
      }

      this._targetX = Math.max(minX, Math.min(0, this._targetX));

      if (!this._isMoved && e) {
        const local = this._cardsContainer.toLocal(e.global);
        for (let i = 0; i < 15; i++) {
          const level = i + 1;
          const cx = startX + i * (cardW + padX);
          if (local.x >= cx && local.x <= cx + cardW && local.y >= 32 && local.y <= 110) {
            const isUnlocked = level <= this.maxUnlockedLevel;
            this.onCardClick(level, isUnlocked);
            break;
          }
        }
      }
    };

    this.on('pointerup', onUp);
    this.on('pointerupoutside', onUp);

    if (typeof window !== 'undefined') {
      window.addEventListener('wheel', (e) => {
        if (!this.destroyed && this.worldVisible) {
          const delta = e.deltaX || e.deltaY;
          if (delta !== 0) {
            this.scrollBy(-delta * 0.8);
          }
        }
      }, { passive: true });
    }
  }

  _startSmoothLoop() {
    const cardW = 54;
    const padX = 8;
    const startX = 44;
    const totalW = startX + 15 * (cardW + padX);
    const minX = Math.min(0, (CONFIG.GAME_WIDTH - 80) - totalW);

    const update = () => {
      if (this.destroyed) return;

      this._currentX += (this._targetX - this._currentX) * 0.22;
      if (this._cardsContainer) {
        this._cardsContainer.x = this._currentX;
      }

      if (!this._isDragging && Math.abs(this._velocity) > 0.1) {
        this._velocity *= 0.88;
      } else {
        this._velocity = 0;
      }

      this._animRaf = requestAnimationFrame(update);
    };

    this._animRaf = requestAnimationFrame(update);
  }

  scrollBy(deltaX) {
    const cardW = 54;
    const padX = 8;
    const startX = 44;
    const totalW = startX + 15 * (cardW + padX);
    const minX = Math.min(0, (CONFIG.GAME_WIDTH - 80) - totalW);

    this._targetX = Math.max(minX, Math.min(0, this._targetX + deltaX));
  }

  scrollToLevel(level) {
    const cardW = 54;
    const padX = 8;
    const startX = 44;
    const totalW = startX + 15 * (cardW + padX);
    const minX = Math.min(0, (CONFIG.GAME_WIDTH - 80) - totalW);

    const targetCardX = startX + (level - 1) * (cardW + padX);
    let desiredX = -(targetCardX - 100);
    this._targetX = Math.max(minX, Math.min(0, desiredX));
  }

  updateMaxLevel(newMaxLevel) {
    this.maxUnlockedLevel = Math.max(1, Math.min(15, newMaxLevel || 1));
    this._draw();
    this.scrollToLevel(this.maxUnlockedLevel);
  }

  destroy(options) {
    if (this._animRaf) {
      cancelAnimationFrame(this._animRaf);
      this._animRaf = null;
    }
    super.destroy(options);
  }
}

export default CatDeck;
