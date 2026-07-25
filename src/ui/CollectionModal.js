import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

/**
 * TASK-015: Экран «Котопедия» — альбом коллекции со стильными замочками 🔒 и шрифтом Fredoka
 */
export class CollectionModal extends Container {
  constructor(app, maxUnlockedLevel = 1, onClose) {
    super();
    this.app = app;
    this.maxUnlockedLevel = Math.max(1, Math.min(15, maxUnlockedLevel || 1));
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

  _draw() {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // 1. Оверлей
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.86 });
    overlay.eventMode = 'static';
    this.addChild(overlay);

    // 2. Карточка Котопедии
    const cardW = 380;
    const cardH = 580;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 20);
    card.fill(0x15122c);
    card.stroke({ color: CONFIG.COLORS.ACCENT || 0xff5e62, width: 2.5 });
    this.addChild(card);

    // 3. Заголовок и счётчик "📖 Котопедия (Открыто N/15)"
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const title = new Text({
      text: `📖 Котопедия (${this.maxUnlockedLevel}/15)`,
      style: titleStyle
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, cardY + 16);
    this.addChild(title);

    // Кнопка закрытия ✕ в правом верхнем углу
    const closeBtn = new Graphics();
    closeBtn.circle(cardX + cardW - 25, cardY + 25, 15);
    closeBtn.fill({ color: 0xff5e62, alpha: 0.9 });
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    this.addChild(closeBtn);

    const xTextStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    const xText = new Text({ text: '✕', style: xTextStyle });
    xText.anchor.set(0.5, 0.5);
    xText.position.set(cardX + cardW - 25, cardY + 25);
    xText.eventMode = 'none';
    this.addChild(xText);

    // 4. Сетка 3x5 слотов
    const cols = 3;
    const slotW = 104;
    const slotH = 92;
    const padX = 12;
    const padY = 10;
    const gridStartX = cardX + (cardW - (cols * slotW + (cols - 1) * padX)) / 2;
    const gridStartY = cardY + 52;

    for (let level = 1; level <= 15; level++) {
      const col = (level - 1) % cols;
      const row = Math.floor((level - 1) / cols);

      const slotX = gridStartX + col * (slotW + padX);
      const slotY = gridStartY + row * (slotH + padY);

      const isUnlocked = level <= this.maxUnlockedLevel;
      const catData = getCatData(level);

      const slotBg = new Graphics();
      slotBg.roundRect(slotX, slotY, slotW, slotH, 12);

      if (isUnlocked) {
        slotBg.fill(catData.color);
        slotBg.stroke({ color: '#ffffff', alpha: 0.5, width: 1.5 });
      } else {
        slotBg.fill(0x191633);
        slotBg.stroke({ color: 0x332c52, width: 1.5 });
      }
      this.addChild(slotBg);

      if (isUnlocked) {
        const texture = getCatTexture(level);
        if (texture) {
          const sprite = new Sprite(texture);
          const spriteSize = 48;
          sprite.width = spriteSize;
          sprite.height = spriteSize;
          sprite.x = slotX + (slotW - spriteSize) / 2;
          sprite.y = slotY + 4;
          this.addChild(sprite);
        } else {
          const emojiStyle = new TextStyle({ fontSize: 28 });
          const emoji = new Text({ text: catData.emoji, style: emojiStyle });
          emoji.anchor.set(0.5, 0.5);
          emoji.position.set(slotX + slotW / 2, slotY + 28);
          this.addChild(emoji);
        }

        const badgeStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 9,
          fontWeight: 'bold',
          fill: '#ffffff'
        });
        const badgeText = new Text({ text: `Lvl ${level}`, style: badgeStyle });
        badgeText.anchor.set(0.5, 0);
        badgeText.position.set(slotX + slotW / 2, slotY + 54);
        this.addChild(badgeText);

        const incStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 9,
          fontWeight: 'bold',
          fill: '#2ecc71'
        });
        const incText = new Text({ text: `+${catData.income}/сек`, style: incStyle });
        incText.anchor.set(0.5, 0);
        incText.position.set(slotX + slotW / 2, slotY + 70);
        this.addChild(incText);
      } else {
        // TASK-015: Замена на стильные замочки 🔒
        const lockStyle = new TextStyle({ fontSize: 24 });
        const lockEmoji = new Text({ text: '🔒', style: lockStyle });
        lockEmoji.anchor.set(0.5, 0.5);
        lockEmoji.position.set(slotX + slotW / 2, slotY + 32);
        this.addChild(lockEmoji);

        const secretStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 10,
          fill: '#6b7280',
          fontWeight: 'bold'
        });
        const secretText = new Text({ text: `Lvl ${level}`, style: secretStyle });
        secretText.anchor.set(0.5, 0);
        secretText.position.set(slotX + slotW / 2, slotY + 60);
        this.addChild(secretText);
      }
    }

    // 5. Кнопка "Закрыть" внизу
    const btnW = 160;
    const btnH = 38;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + cardH - 48;

    const btnBg = new Graphics();
    btnBg.roundRect(btnX, btnY, btnW, btnH, 10);
    btnBg.fill(CONFIG.COLORS.ACCENT || 0xff5e62);
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';

    btnBg.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    btnBg.on('pointerover', () => { btnBg.alpha = 0.88; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1.0; });
    this.addChild(btnBg);

    const btnStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    const btnText = new Text({ text: 'Закрыть', style: btnStyle });
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(W / 2, btnY + btnH / 2);
    btnText.eventMode = 'none';
    this.addChild(btnText);
  }

  _close() {
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
    this.destroy({ children: true });
  }
}

export default CollectionModal;
