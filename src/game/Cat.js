import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture, getUITexture } from '../utils/catTextures.js';
import { getCatData, getCatWorldTint } from '../utils/catVisuals.js';

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

    // 1. Овальный подставка-glow под котиком
    const baseGlow = new Graphics();
    baseGlow.ellipse(cardWidth / 2, cardHeight - 8, 28, 10);
    baseGlow.fill({ color: catData.color || 0xffd700, alpha: 0.55 });
    mainContainer.addChild(baseGlow);

    const texture = getCatTexture(this.level);

    if (texture) {
      const catSize = cardWidth - 10; // 62px - perfect fit inside 72px card
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = catSize;
      sprite.height = catSize;
      sprite.x = cardWidth / 2;
      sprite.y = cardHeight / 2 - 4; // 32px center
      const tint = getCatWorldTint();
      if (tint && tint !== 0xffffff) sprite.tint = tint;
      mainContainer.addChild(sprite);
    } else {
      const emojiStyle = new TextStyle({ fontSize: 38, align: 'center' });
      const emojiText = new Text({ text: catData.emoji, style: emojiStyle });
      emojiText.anchor.set(0.5, 0.5);
      emojiText.x = cardWidth / 2;
      emojiText.y = cardHeight / 2;
      mainContainer.addChild(emojiText);
    }

    // 2. Компактный бейджик уровня под пьедесталом (Fredoka font)
    const badgeW = this.level >= 10 ? 36 : 30;
    const badgeH = 14;
    const badgeX = (cardWidth - badgeW) / 2;
    const badgeY = cardHeight - 16; // y = 56px

    const badgeBg = new Graphics();
    badgeBg.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    badgeBg.fill({ color: 0x0c0821, alpha: 0.45 });
    badgeBg.stroke({ color: catData.color || 0xffd700, alpha: 0.7, width: 1 });
    mainContainer.addChild(badgeBg);

    const levelStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 9,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.8, blur: 2, distance: 1 }
    });
    const levelText = new Text({ text: `Lvl ${this.level}`, style: levelStyle });
    levelText.anchor.set(0.5, 0.5);
    levelText.x = cardWidth / 2;
    levelText.y = badgeY + badgeH / 2;
    mainContainer.addChild(levelText);

    this.addChild(mainContainer);
    this._animatedContainer = mainContainer;

    if (this._glowColor) {
      this._createGlowGraphic(this._glowColor);
    }
  }

  /** Когда PNG доехал после эмодзи-фолбэка — перерисовать котика. */
  refreshArt() {
    if (!getCatTexture(this.level)) return;
    const glow = this._glowColor;
    this._stopIdleAnimation();
    this._draw();
    this._startIdleAnimation();
    this._setupRarityAura();
    if (glow) this.setGlow(true, glow);
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

    let auraColor = 0x9b59b6; // Lvl 5-8: Фиолетовый
    let strokeColor = 0xc084fc;

    if (this.level >= 9 && this.level <= 12) {
      auraColor = 0xffd700; // Lvl 9-12: Золотой
      strokeColor = 0xfbbf24;
    } else if (this.level >= 13) {
      auraColor = 0x00f2fe; // Lvl 13-15: Легендарный
      strokeColor = 0x38bdf8;
    }

    const cardWidth = CONFIG.CELL_SIZE - 2;

    // Статичное нежное свечение под пьедесталом котика без моргания
    this._rarityAura = new Graphics();
    this._rarityAura.ellipse(cardWidth / 2, cardWidth - 8, 30, 11);
    this._rarityAura.fill({ color: auraColor, alpha: 0.3 });
    this._rarityAura.stroke({ color: strokeColor, width: 1.5, alpha: 0.6 });

    this.addChildAt(this._rarityAura, 0);
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
