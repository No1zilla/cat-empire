import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData } from '../utils/catVisuals.js';

/**
 * TASK-018B: Премиальное окно детального просмотра котика при тапе в Котопедии
 */
export class CatDetailModal extends Container {
  constructor(app, level = 1, onClose) {
    super();
    this.app = app;
    this.level = Math.max(1, Math.min(15, level || 1));
    this.onClose = onClose || (() => {});

    this.eventMode = 'static';
    this._draw();
    this._playPopIn();
  }

  _playPopIn() {
    this.scale.set(0.7);
    this.alpha = 0.4;
    const start = performance.now();
    const animate = () => {
      if (this.destroyed) return;
      const elapsed = performance.now() - start;
      if (elapsed < 160) {
        const p = elapsed / 160;
        this.scale.set(0.7 + p * 0.35);
        this.alpha = 0.4 + p * 0.6;
      } else if (elapsed < 280) {
        const p = (elapsed - 160) / 120;
        this.scale.set(1.05 - p * 0.05);
        this.alpha = 1.0;
      } else {
        this.scale.set(1.0);
        this.alpha = 1.0;
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  _draw() {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const catData = getCatData(this.level);

    // 1. Полупрозрачный подложечный фоновый слой
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    this.addChild(overlay);

    // 2. Карточка модалки (340x440)
    const cardW = 340;
    const cardH = 440;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 24);
    card.fill(0x16122e);
    card.stroke({ color: 0xffd700, width: 3 });
    this.addChild(card);

    // Внутренний золотой свечение-градиент
    const glowBorder = new Graphics();
    glowBorder.roundRect(cardX + 4, cardY + 4, cardW - 8, cardH - 8, 20);
    glowBorder.stroke({ color: 0xffaa00, alpha: 0.4, width: 1.5 });
    this.addChild(glowBorder);

    // 3. Заголовок модалки (Уровень + Имя кота)
    const nameStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 4, distance: 2 }
    });
    const nameText = new Text({
      text: `${catData.name || `Кот Lvl ${this.level}`}`,
      style: nameStyle
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(W / 2, cardY + 20);
    this.addChild(nameText);

    const lvlStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffd700'
    });
    const lvlText = new Text({
      text: `УРОВЕНЬ ${this.level}из 15`,
      style: lvlStyle
    });
    lvlText.anchor.set(0.5, 0);
    lvlText.position.set(W / 2, cardY + 48);
    this.addChild(lvlText);

    // 4. Крупный 3D арт котика (128x128)
    const artBg = new Graphics();
    artBg.roundRect((W - 140) / 2, cardY + 74, 140, 140, 20);
    artBg.fill(catData.color || 0x282046);
    artBg.stroke({ color: '#ffffff', alpha: 0.5, width: 2 });
    this.addChild(artBg);

    const texture = getCatTexture(this.level);
    if (texture) {
      const sprite = new Sprite(texture);
      sprite.width = 120;
      sprite.height = 120;
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(W / 2, cardY + 144);
      this.addChild(sprite);
    }

    // Звёздочки редкости ⭐⭐⭐
    const starsStyle = new TextStyle({ fontSize: 16 });
    const starsText = new Text({ text: '⭐ ⭐ ⭐ ⭐ ⭐', style: starsStyle });
    starsText.anchor.set(0.5, 0);
    starsText.position.set(W / 2, cardY + 224);
    this.addChild(starsText);

    // 5. Характеристики дохода
    const statsBg = new Graphics();
    statsBg.roundRect(cardX + 24, cardY + 252, cardW - 48, 54, 12);
    statsBg.fill(0x0e0b1f);
    statsBg.stroke({ color: 0x3d356c, width: 1.5 });
    this.addChild(statsBg);

    const incLabelStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 11,
      fill: '#9ca3af'
    });
    const incLabel = new Text({ text: 'Пассивный доход:', style: incLabelStyle });
    incLabel.position.set(cardX + 38, cardY + 260);
    this.addChild(incLabel);

    const incValueStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#2ecc71'
    });
    const incValue = new Text({
      text: `+${catData.income} монет/сек`,
      style: incValueStyle
    });
    incValue.position.set(cardX + 38, cardY + 276);
    this.addChild(incValue);

    const coinIcon = UIUtils.createCoinIcon(8, true);
    coinIcon.position.set(cardX + 38 + incValue.width + 12, cardY + 276 + incValue.height / 2 - 1);
    this.addChild(coinIcon);

    // 6. Описание / Лор котика
    const descStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fill: '#d1d5db',
      wordWrap: true,
      wordWrapWidth: cardW - 50,
      align: 'center'
    });
    const descText = new Text({
      text: catData.description || 'Элитный пушистый обитатель Кошачьей Империи!',
      style: descStyle
    });
    descText.anchor.set(0.5, 0);
    descText.position.set(W / 2, cardY + 318);
    this.addChild(descText);

    // 7. Кнопка «Закрыть»
    const btnW = 160;
    const btnH = 40;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + cardH - 56;

    const closeBtn = new Graphics();
    closeBtn.roundRect(btnX, btnY, btnW, btnH, 12);
    closeBtn.fill(0xff5e62);
    closeBtn.stroke({ color: '#ffffff', alpha: 0.6, width: 1.5 });
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';

    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    closeBtn.on('pointerover', () => { closeBtn.alpha = 0.88; });
    closeBtn.on('pointerout', () => { closeBtn.alpha = 1.0; });
    this.addChild(closeBtn);

    const closeStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    const closeText = new Text({ text: 'Закрыть', style: closeStyle });
    closeText.anchor.set(0.5, 0.5);
    closeText.position.set(W / 2, btnY + btnH / 2);
    closeText.eventMode = 'none';
    this.addChild(closeText);
  }

  _close() {
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
    this.destroy({ children: true });
  }
}

export default CatDetailModal;
