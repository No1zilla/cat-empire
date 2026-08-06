import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

/**
 * TASK-015: Модальное окно открытия нового котика (вспышка, лучи и пружинящая анимация)
 */
export class NewCatModal extends Container {
  constructor(app, level, rewardGems = 5, onClose) {
    super();
    this.app = app;
    this.level = level;
    this.rewardGems = rewardGems;
    this.onClose = onClose || (() => {});
    this._raysContainer = null;
    this._rafId = null;

    this.zIndex = 99999;
    this.eventMode = 'static';
    this._draw();
    this._startRayRotation();
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
    const catData = getCatData(this.level);

    // 1. Оверлей
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.86 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    overlay.on('pointerup', (e) => e.stopPropagation());
    overlay.on('pointertap', (e) => e.stopPropagation());
    this.addChild(overlay);

    // 2. Вращающиеся лучи (Sunburst)
    this._raysContainer = new Container();
    this._raysContainer.position.set(W / 2, H / 2 - 40);

    const rayCount = 12;
    const rayLength = 230;
    const rayAngle = (Math.PI * 2) / rayCount;

    for (let i = 0; i < rayCount; i++) {
      const ray = new Graphics();
      const a1 = i * rayAngle - rayAngle / 4;
      const a2 = i * rayAngle + rayAngle / 4;

      ray.moveTo(0, 0);
      ray.lineTo(Math.cos(a1) * rayLength, Math.sin(a1) * rayLength);
      ray.lineTo(Math.cos(a2) * rayLength, Math.sin(a2) * rayLength);
      ray.closePath();
      ray.fill({ color: 0xffd700, alpha: i % 2 === 0 ? 0.28 : 0.12 });
      this._raysContainer.addChild(ray);
    }
    this.addChild(this._raysContainer);

    // 3. Карточка модального окна
    const cardW = 320;
    const cardH = 340;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2 - 10;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 20);
    card.fill(0x15102A);  // TOKENS.panelBg — единый фон модалки
    card.stroke({ color: 0xffd700, width: 3 });
    this.addChild(card);

    // 4. Заголовок "🎉 НОВЫЙ КОТИК!"
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 22,
      fontWeight: 'bold',
      fill: CONFIG.COLORS.GOLD || '#ffd700',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 4, distance: 1 }
    });
    const title = new Text({ text: '🎉 НОВЫЙ КОТИК!', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, cardY + 20);
    this.addChild(title);

    // Кнопка закрытия ✕
    const closeBtnStyle = new TextStyle({ fontSize: 18, fill: '#aaaaaa', fontWeight: 'bold' });
    const closeBtn = new Text({ text: '✕', style: closeBtnStyle });
    closeBtn.anchor.set(0.5, 0.5);
    closeBtn.position.set(cardX + cardW - 20, cardY + 20);
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    this.addChild(closeBtn);

    // 5. Изображение котика
    const texture = getCatTexture(this.level);
    if (texture) {
      const sprite = new Sprite(texture);
      const size = 110;
      sprite.width = size;
      sprite.height = size;
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(W / 2, cardY + 115);
      this.addChild(sprite);
    } else {
      const emojiStyle = new TextStyle({ fontSize: 72 });
      const emoji = new Text({ text: catData.emoji, style: emojiStyle });
      emoji.anchor.set(0.5, 0.5);
      emoji.position.set(W / 2, cardY + 115);
      this.addChild(emoji);
    }

    // 6. Имя котика
    const nameStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const catNameText = new Text({ text: `Lvl ${this.level} — ${catData.name}`, style: nameStyle });
    catNameText.anchor.set(0.5, 0);
    catNameText.position.set(W / 2, cardY + 180);
    this.addChild(catNameText);

    // 7. Доходность
    const statsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#2ecc71',
      align: 'center'
    });
    const statsText = new Text({ text: `Доход: +${catData.income}/сек`, style: statsStyle });
    statsText.anchor.set(0.5, 0);
    statsText.position.set(W / 2, cardY + 210);
    this.addChild(statsText);

    // 9. Кнопка "Круто! 🚀"
    const btnW = 200;
    const btnH = 46;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + cardH - 54;

    const btnBg = new Graphics();
    btnBg.roundRect(btnX, btnY, btnW, btnH, 14);
    btnBg.fill(0xFF6B6B);  // TOKENS.btnBuy
    btnBg.stroke({ color: '#ffffff', alpha: 0.4, width: 2 });
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
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const btnText = new Text({ text: 'Круто! 🚀', style: btnStyle });
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(W / 2, btnY + btnH / 2);
    btnText.eventMode = 'none';
    this.addChild(btnText);
  }

  _startRayRotation() {
    const rotate = () => {
      if (this._raysContainer && !this.destroyed) {
        this._raysContainer.rotation += 0.006;
        this._rafId = requestAnimationFrame(rotate);
      }
    };
    this._rafId = requestAnimationFrame(rotate);
  }

  _close() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
    this.destroy({ children: true });
  }
}

export default NewCatModal;
