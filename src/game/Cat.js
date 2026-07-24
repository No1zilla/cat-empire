import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

// Класс котика: Крупная яркая карточка + крупный прозрачный спрайт + плашка Lvl N + анимации
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

    const cardWidth = CONFIG.CELL_SIZE - 4;  // 66px при CELL_SIZE=70 (КРУПНО!)
    const cardHeight = CONFIG.CELL_SIZE - 4; // 66px
    const catData = getCatData(this.level);

    // Главный контейнер котика (анимируется целиком)
    const mainContainer = new Container();

    // 1. Фон-карточка котика (сочный цвет уровня + яркий контур)
    const bg = new Graphics();
    bg.roundRect(0, 0, cardWidth, cardHeight, 12);
    bg.fill(catData.color);
    bg.stroke({ color: '#ffffff', alpha: 0.45, width: 2.0 });
    mainContainer.addChild(bg);

    const texture = getCatTexture(this.level);

    if (texture) {
      // 2. Крупный спрайт персонажа
      const sprite = new Sprite(texture);
      const catSize = cardWidth - 8; // 58px! Персонаж занимает всю карточку
      sprite.width = catSize;
      sprite.height = catSize;
      sprite.x = (cardWidth - catSize) / 2;
      sprite.y = (cardHeight - catSize) / 2 - 3;
      mainContainer.addChild(sprite);
    } else {
      // Fallback на эмодзи
      const emojiStyle = new TextStyle({ fontSize: 34, align: 'center' });
      const emojiText = new Text({ text: catData.emoji, style: emojiStyle });
      emojiText.anchor.set(0.5, 0.5);
      emojiText.x = cardWidth / 2;
      emojiText.y = cardHeight / 2 - 4;
      mainContainer.addChild(emojiText);
    }

    // 3. Аккуратная плашка с уровнем (Lvl N)
    const badgeW = 42;
    const badgeH = 15;
    const badgeBg = new Graphics();
    badgeBg.roundRect((cardWidth - badgeW) / 2, cardHeight - 16, badgeW, badgeH, 6);
    badgeBg.fill({ color: 0x000000, alpha: 0.75 });
    badgeBg.stroke({ color: '#ffffff', alpha: 0.3, width: 1 });
    mainContainer.addChild(badgeBg);

    const levelStyle = new TextStyle({
      fontSize: 10,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center'
    });
    const levelText = new Text({ text: `Lvl ${this.level}`, style: levelStyle });
    levelText.anchor.set(0.5, 0.5);
    levelText.x = cardWidth / 2;
    levelText.y = cardHeight - 8.5;
    mainContainer.addChild(levelText);

    this.addChild(mainContainer);
    this._animatedContainer = mainContainer;
  }

  // Idle-анимация: котик плавно покачивается вверх-вниз
  _startIdleAnimation() {
    const amplitude = 3.0;
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
    const jumpHeight = 22;

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
