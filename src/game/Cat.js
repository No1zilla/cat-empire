import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

// Класс котика — спрайт с idle-анимацией и прыжком при merge/спавне
export class Cat extends Container {
  constructor(level = 1, slotIndex = 0) {
    super();
    this.level = level;
    this.slotIndex = slotIndex;
    this._ticker = null;
    this._sprite = null;
    this._draw();
    this._startIdleAnimation();
  }

  _draw() {
    this.removeChildren();

    const targetSize = CONFIG.CELL_SIZE - 10;
    const texture = getCatTexture(this.level);

    if (texture) {
      // === СПРАЙТ-РЕЖИМ (TASK-008) ===
      const sprite = new Sprite(texture);
      const scale = targetSize / Math.max(sprite.texture.width, sprite.texture.height);
      sprite.scale.set(scale);
      // Центрируем по горизонтали, прижимаем к низу ячейки
      sprite.x = (targetSize - sprite.width) / 2;
      sprite.y = targetSize - sprite.height;
      this.addChild(sprite);
      this._sprite = sprite;
    } else {
      // === FALLBACK: эмодзи-карточка (пока текстуры не загружены) ===
      const catData = getCatData(this.level);
      const bg = new Graphics();
      bg.roundRect(0, 0, targetSize, targetSize, 12);
      bg.fill(catData.color);
      this.addChild(bg);

      const emojiStyle = new TextStyle({ fontSize: 30, align: 'center' });
      const emojiText = new Text({ text: catData.emoji, style: emojiStyle });
      emojiText.anchor.set(0.5, 0.5);
      emojiText.x = targetSize / 2;
      emojiText.y = targetSize / 2 - 4;
      this.addChild(emojiText);

      // Создаём фейковый _sprite для анимации
      this._sprite = emojiText;
      this._sprite._baseY = targetSize / 2 - 4;
    }
  }

  // Idle-анимация: котик плавно покачивается вверх-вниз
  _startIdleAnimation() {
    const amplitude = 3;
    const speed = 0.002;
    const startTime = Date.now() + Math.random() * 1000;

    const tick = () => {
      if (!this._sprite || this.destroyed) return;
      const elapsed = Date.now() - startTime;
      const baseY = this._sprite._baseY ?? (CONFIG.CELL_SIZE - 10 - (this._sprite.height || 50));
      this._sprite.y = baseY + Math.sin(elapsed * speed) * amplitude;
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

  // Анимация прыжка — вызывается при спавне и merge
  playJumpAnimation() {
    this._stopIdleAnimation();
    const startTime = Date.now();
    const duration = 400;
    const jumpHeight = 25;
    const baseY = this._sprite?._baseY
      ?? (CONFIG.CELL_SIZE - 10 - (this._sprite?.height || 50));

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const offsetY = -Math.sin(Math.PI * progress) * jumpHeight;
        if (this._sprite) this._sprite.y = baseY + offsetY;
        requestAnimationFrame(animate);
      } else {
        if (this._sprite) this._sprite.y = baseY;
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
