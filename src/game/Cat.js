import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture, getUITexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

// Класс котика (TASK-015B: Rarity Visual System — Ауры 5+ уровней)
export class Cat extends Container {
  constructor(level = 1, slotIndex = 0) {
    super();
    this.level = level;
    this.slotIndex = slotIndex;
    this._ticker = null;
    this._glowTicker = null;
    this._rarityTicker = null;
    this._animatedContainer = null;
    this._glowGraphic = null;
    this._rarityAura = null;
    this._glowColor = null;

    this._draw();
    this._startIdleAnimation();
    this._setupRarityAura();
  }

  _draw() {
    this.removeChildren();

    const cardWidth = CONFIG.CELL_SIZE - 2;  // 72px при CELL_SIZE=74
    const cardHeight = CONFIG.CELL_SIZE - 2; // 72px
    const catData = getCatData(this.level);

    // Главный контейнер котика
    const mainContainer = new Container();

    // 1. Сочная карточка котика и 3D Пьедестал
    const bg = new Graphics();
    bg.roundRect(0, 0, cardWidth, cardHeight, 12);
    bg.fill(catData.color);
    bg.stroke({ color: '#ffffff', alpha: 0.6, width: 2.0 });
    mainContainer.addChild(bg);

    const pedestalTex = getUITexture('pedestal_gold');
    if (pedestalTex) {
      const pedestalSprite = new Sprite(pedestalTex);
      pedestalSprite.width = cardWidth;
      pedestalSprite.height = cardHeight;
      pedestalSprite.alpha = 0.5;
      mainContainer.addChild(pedestalSprite);
    }

    const texture = getCatTexture(this.level);

    if (texture) {
      const sprite = new Sprite(texture);
      const catSize = cardWidth - 2;
      sprite.width = catSize;
      sprite.height = catSize;
      sprite.x = (cardWidth - catSize) / 2;
      sprite.y = (cardHeight - catSize) / 2;
      mainContainer.addChild(sprite);
    } else {
      const emojiStyle = new TextStyle({ fontSize: 40, align: 'center' });
      const emojiText = new Text({ text: catData.emoji, style: emojiStyle });
      emojiText.anchor.set(0.5, 0.5);
      emojiText.x = cardWidth / 2;
      emojiText.y = cardHeight / 2;
      mainContainer.addChild(emojiText);
    }

    // 2. Компактный бейджик уровня (Fredoka font)
    const badgeW = 32;
    const badgeH = 14;
    const badgeBg = new Graphics();
    badgeBg.roundRect(cardWidth - badgeW - 2, 2, badgeW, badgeH, 5);
    badgeBg.fill({ color: 0x000000, alpha: 0.8 });
    badgeBg.stroke({ color: '#ffffff', alpha: 0.4, width: 1 });
    mainContainer.addChild(badgeBg);

    const levelStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 9,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center'
    });
    const levelText = new Text({ text: `Lvl ${this.level}`, style: levelStyle });
    levelText.anchor.set(0.5, 0.5);
    levelText.x = cardWidth - badgeW / 2 - 2;
    levelText.y = 8.5;
    mainContainer.addChild(levelText);

    this.addChild(mainContainer);
    this._animatedContainer = mainContainer;

    if (this._glowColor) {
      this._createGlowGraphic(this._glowColor);
    }
  }

  // TASK-015B: Rarity Visual System — Аура под котиками 5+ уровня
  _setupRarityAura() {
    this._stopRarityAnimation();
    if (this._rarityAura) {
      if (this._rarityAura.parent) this._rarityAura.parent.removeChild(this._rarityAura);
      this._rarityAura.destroy();
      this._rarityAura = null;
    }

    if (this.level < 5) return;

    let auraColor = 0x9b59b6; // Lvl 5-8: Фиолетовый (Редкий)
    let strokeColor = 0xc084fc;

    if (this.level >= 9 && this.level <= 12) {
      auraColor = 0xffd700; // Lvl 9-12: Золотой (Эпический)
      strokeColor = 0xfbbf24;
    } else if (this.level >= 13) {
      auraColor = 0x00f2fe; // Lvl 13-15: Легендарный (Бриллиантовый)
      strokeColor = 0x38bdf8;
    }

    const cardWidth = CONFIG.CELL_SIZE - 2;
    const cardHeight = CONFIG.CELL_SIZE - 2;

    this._rarityAura = new Graphics();
    this._rarityAura.roundRect(-4, -4, cardWidth + 8, cardHeight + 8, 14);
    this._rarityAura.fill({ color: auraColor, alpha: 0.35 });
    this._rarityAura.stroke({ color: strokeColor, width: 2.5, alpha: 0.85 });

    this.addChildAt(this._rarityAura, 0);

    const start = performance.now();
    const speed = 0.0035;

    const tickRarity = () => {
      if (!this._rarityAura || this.destroyed) return;
      const now = performance.now() - start;
      const pulse = 0.4 + Math.sin(now * speed) * 0.35;
      this._rarityAura.alpha = pulse;
      this._rarityTicker = requestAnimationFrame(tickRarity);
    };

    this._rarityTicker = requestAnimationFrame(tickRarity);
  }

  _stopRarityAnimation() {
    if (this._rarityTicker) {
      cancelAnimationFrame(this._rarityTicker);
      this._rarityTicker = null;
    }
  }

  // TASK-011: Управление подсвечивающей пульсирующей аурой
  setGlow(enabled, color = 0xffd700) {
    if (!enabled) {
      this._stopGlowAnimation();
      if (this._glowGraphic) {
        if (this._glowGraphic.parent) {
          this._glowGraphic.parent.removeChild(this._glowGraphic);
        }
        this._glowGraphic.destroy();
        this._glowGraphic = null;
      }
      this._glowColor = null;
      return;
    }

    if (this._glowGraphic && this._glowColor === color) return;

    this._stopGlowAnimation();
    if (this._glowGraphic) {
      if (this._glowGraphic.parent) {
        this._glowGraphic.parent.removeChild(this._glowGraphic);
      }
      this._glowGraphic.destroy();
    }

    this._glowColor = color;
    this._createGlowGraphic(color);
    this._startGlowAnimation();
  }

  _createGlowGraphic(color) {
    const cardWidth = CONFIG.CELL_SIZE - 2;
    const cardHeight = CONFIG.CELL_SIZE - 2;

    this._glowGraphic = new Graphics();
    this._glowGraphic.roundRect(-6, -6, cardWidth + 12, cardHeight + 12, 16);
    this._glowGraphic.fill({ color: color, alpha: 0.35 });
    this._glowGraphic.stroke({ color: color, width: 3.0, alpha: 0.9 });

    this.addChildAt(this._glowGraphic, 0);
  }

  _startGlowAnimation() {
    const startTime = Date.now();
    const speed = 0.005;

    const tick = () => {
      if (!this._glowGraphic || this.destroyed) return;
      const elapsed = Date.now() - startTime;
      const pulse = 0.55 + Math.sin(elapsed * speed) * 0.4;
      this._glowGraphic.alpha = pulse;
      this._glowTicker = requestAnimationFrame(tick);
    };

    this._glowTicker = requestAnimationFrame(tick);
  }

  _stopGlowAnimation() {
    if (this._glowTicker) {
      cancelAnimationFrame(this._glowTicker);
      this._glowTicker = null;
    }
  }

  // Idle-анимация: котик плавно покачивается вверх-вниз
  _startIdleAnimation() {
    const amplitude = 3.5;
    const speed = 0.0028;
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

  // Анимация прыжка
  playJumpAnimation() {
    this._stopIdleAnimation();
    const startTime = Date.now();
    const duration = 350;
    const jumpHeight = 24;

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
    this._setupRarityAura();
  }

  destroy(options) {
    this._stopIdleAnimation();
    this._stopGlowAnimation();
    this._stopRarityAnimation();
    super.destroy(options);
  }
}

export default Cat;
