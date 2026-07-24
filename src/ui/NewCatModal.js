import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

/**
 * TASK-010: Модальное окно открытия нового котика (Wow-экран со вспышкой и лучами)
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

    this.eventMode = 'static'; // блокирует клики сквозь оверлей
    this._draw();
    this._startRayRotation();
  }

  _draw() {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const catData = getCatData(this.level);

    // 1. Полупрозрачный оверлей
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.82 });
    overlay.eventMode = 'static';
    this.addChild(overlay);

    // 2. Вращающиеся лучи (Sunburst) в центре
    this._raysContainer = new Container();
    this._raysContainer.position.set(W / 2, H / 2 - 40);

    const rayCount = 12;
    const rayLength = 220;
    const rayAngle = (Math.PI * 2) / rayCount;

    for (let i = 0; i < rayCount; i++) {
      const ray = new Graphics();
      const a1 = i * rayAngle - rayAngle / 4;
      const a2 = i * rayAngle + rayAngle / 4;

      ray.moveTo(0, 0);
      ray.lineTo(Math.cos(a1) * rayLength, Math.sin(a1) * rayLength);
      ray.lineTo(Math.cos(a2) * rayLength, Math.sin(a2) * rayLength);
      ray.closePath();
      ray.fill({ color: 0xffd700, alpha: i % 2 === 0 ? 0.25 : 0.12 });
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
    card.fill(CONFIG.COLORS.GRID_BG || 0x16213e);
    card.stroke({ color: CONFIG.COLORS.GOLD || 0xffd700, width: 3 });
    this.addChild(card);

    // 4. Заголовок "🎉 НОВЫЙ КОТИК!"
    const titleStyle = new TextStyle({
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

    // 5. Изображение открытого котика
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

    // 6. Имя котика и Уровень
    const nameStyle = new TextStyle({
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const catNameText = new Text({ text: `Lvl ${this.level} — ${catData.name}`, style: nameStyle });
    catNameText.anchor.set(0.5, 0);
    catNameText.position.set(W / 2, cardY + 180);
    this.addChild(catNameText);

    // 7. Доходность (+N/сек)
    const statsStyle = new TextStyle({
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#2ecc71',
      align: 'center'
    });
    const statsText = new Text({ text: `Доход: +${catData.income}/сек`, style: statsStyle });
    statsText.anchor.set(0.5, 0);
    statsText.position.set(W / 2, cardY + 210);
    this.addChild(statsText);

    // 8. Плашка Награды (+5 гемов)
    const rewardStyle = new TextStyle({
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#a8d8ff',
      align: 'center'
    });
    const rewardText = new Text({ text: `Награда: +${this.rewardGems} 💎`, style: rewardStyle });
    rewardText.anchor.set(0.5, 0);
    rewardText.position.set(W / 2, cardY + 238);
    this.addChild(rewardText);

    // 9. Кнопка "Круто! 🚀"
    const btnW = 200;
    const btnH = 46;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + cardH - 58;

    const btnBg = new Graphics();
    btnBg.roundRect(btnX, btnY, btnW, btnH, 12);
    btnBg.fill(CONFIG.COLORS.ACCENT || 0xe94560);
    btnBg.stroke({ color: '#ffffff', alpha: 0.4, width: 1.5 });
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';

    btnBg.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    btnBg.on('pointerover', () => { btnBg.alpha = 0.85; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1.0; });
    this.addChild(btnBg);

    const btnStyle = new TextStyle({
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
