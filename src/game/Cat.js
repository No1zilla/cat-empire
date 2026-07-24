import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

// Класс котика: цветная карточка уровня + спрайт персонажа + плашка Lvl + анимации
export class Cat extends Container {
  constructor(level = 1, slotIndex = 0) {
    super();
    this.level = level;
    this.slotIndex = slotIndex;
    this._ticker = null;
    this._animatedContainer = null;
    this._draw();
    this._startIdleAnimation();
  }

  _draw() {
    this.removeChildren();

    const cardWidth = CONFIG.CELL_SIZE - 10;  // 52px при CELL_SIZE=62
    const cardHeight = CONFIG.CELL_SIZE - 10; // 52px
    const catData = getCatData(this.level);

    // Главный контейнер для всех элементов котика (анимируется целиком)
    const mainContainer = new Container();

    // 1. Фон-карточка котика (яркий цвет уровня + выравнивание + белая полупрозрачная рамка)
    const bg = new Graphics();
    bg.roundRect(0, 0, cardWidth, cardHeight, 10);
    bg.fill(catData.color);
    bg.stroke({ color: '#ffffff', alpha: 0.35, width: 1.5 });
    mainContainer.addChild(bg);

    const texture = getCatTexture(this.level);

    if (texture) {
      // 2. Спрайт персонажа с маской
      const spriteContainer = new Container();
      const mask = new Graphics();
      mask.roundRect(0, 0, cardWidth, cardHeight, 10);
      mask.fill(0xffffff);
      spriteContainer.addChild(mask);
      spriteContainer.mask = mask;

      const sprite = new Sprite(texture);
      // Масштабируем спрайт по ширине ячейки
      const scale = (cardWidth - 4) / sprite.texture.width;
      sprite.scale.set(scale);
      sprite.x = (cardWidth - sprite.width) / 2;
      // Смещаем вниз, чтобы подрезать нижний отступ листа и показать персонажа в центре
      sprite.y = cardHeight - sprite.height + 6;

      spriteContainer.addChild(sprite);
      mainContainer.addChild(spriteContainer);
    } else {
      // Fallback на эмодзи
      const emojiStyle = new TextStyle({ fontSize: 26, align: 'center' });
      const emojiText = new Text({ text: catData.emoji, style: emojiStyle });
      emojiText.anchor.set(0.5, 0.5);
      emojiText.x = cardWidth / 2;
      emojiText.y = cardHeight / 2 - 4;
      mainContainer.addChild(emojiText);
    }

    // 3. Плашка с уровнем (Lvl N)
    const badgeW = 38;
    const badgeH = 13;
    const badgeBg = new Graphics();
    badgeBg.roundRect((cardWidth - badgeW) / 2, cardHeight - 14, badgeW, badgeH, 5);
    badgeBg.fill({ color: 0x000000, alpha: 0.65 });
    mainContainer.addChild(badgeBg);

    const levelStyle = new TextStyle({
      fontSize: 9,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center'
    });
    const levelText = new Text({ text: `Lvl ${this.level}`, style: levelStyle });
    levelText.anchor.set(0.5, 0.5);
    levelText.x = cardWidth / 2;
    levelText.y = cardHeight - 7.5;
    mainContainer.addChild(levelText);

    this.addChild(mainContainer);
    this._animatedContainer = mainContainer;
  }

  // Idle-анимация: котик плавно покачивается вверх-вниз
  _startIdleAnimation() {
    const amplitude = 2.5;
    const speed = 0.0025;
    const startTime = Date.now() + Math.random() * 1000;

    const tick = () => {
      if (!this._animatedContainer || this.destroyed) return;
      const elapsed = Date.now() - startTime;
      this._animatedContainer.y = Math.sin(elapsed * speed) * amplitude;
      this._ticker = requestAnimationFrame(tick);
    };

    this._ticker = requestAnimationFrame(tick);
  }

  _stopIdleAnimation() {
    if (this._ticker) {
      cancelAnimationFrame(this._ticker);
      this._ticker = null;
    }
  }

  // Анимация прыжка (при спавне и merge)
  playJumpAnimation() {
    this._stopIdleAnimation();
    const startTime = Date.now();
    const duration = 350;
    const jumpHeight = 18;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const offsetY = -Math.sin(Math.PI * progress) * jumpHeight;
        if (this._animatedContainer) this._animatedContainer.y = offsetY;
        requestAnimationFrame(animate);
      } else {
        if (this._animatedContainer) this._animatedContainer.y = 0;
        this._startIdleAnimation();
      }
    };

    requestAnimationFrame(animate);
  }

  setLevel(newLevel) {
    this._stopIdleAnimation();
    this.level = newLevel;
    this._draw();
    this._startIdleAnimation();
  }

  destroy(options) {
    this._stopIdleAnimation();
    super.destroy(options);
  }
}

export default Cat;
