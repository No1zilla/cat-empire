import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';
import { getCatData, setCatWorld } from '../utils/catVisuals.js';
import { CatDetailModal } from './CatDetailModal.js';
import { getWorldTitle } from '../config/worlds.js';
import { UIUtils } from '../utils/UIUtils.js';

/**
 * TASK-018B: Переработанная Котопедия AAA качества (1 в 1 с промо-скриншотом №2)
 */
export class CollectionModal extends Container {
  constructor(app, maxUnlockedLevel = 1, onClose, extra = {}) {
    super();
    this.app = app;
    this.maxUnlockedLevel = Math.max(1, Math.min(15, maxUnlockedLevel || 1));
    this.onClose = onClose || (() => {});
    this.viewWorld = extra.worldIndex || 1;
    this.bestByWorld = extra.bestByWorld || {};
    this.worldsCleared = Number(extra.worldsCleared || 0);

    this.eventMode = 'static';
    this._draw();
    this._playPopInAnimation();
  }

  _playPopInAnimation() {
    this.scale.set(0.8);
    this.alpha = 0.5;
    const startAnim = performance.now();
    const popIn = () => {
      if (this.destroyed) return;
      const elapsed = performance.now() - startAnim;
      if (elapsed < 180) {
        const p = elapsed / 180;
        this.scale.set(0.8 + p * 0.25);
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
    this.removeChildren();
    setCatWorld(this.viewWorld);
    const viewedMax = Math.max(1, Number(this.bestByWorld[this.viewWorld] || this.maxUnlockedLevel));
    this.maxUnlockedLevel = viewedMax;

    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // 1. Оверлей матового тёмного стекла
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    const stopEvt = (e) => { if (e && typeof e.stopPropagation === 'function') e.stopPropagation(); };
    overlay.on('pointerdown', stopEvt);
    overlay.on('pointerup', stopEvt);
    overlay.on('pointertap', stopEvt);
    overlay.on('tap', stopEvt);
    overlay.on('click', stopEvt);
    overlay.on('touchstart', stopEvt);
    this.addChild(overlay);

    // 2. Карточка Котопедии
    const cardW = 390;
    const cardH = 610;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 22);
    card.fill(0x15112e);
    card.stroke({ color: 0xffd700, width: 2.5 });
    this.addChild(card);

    // Золотая внутренняя рамка
    const innerFrame = new Graphics();
    innerFrame.roundRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 18);
    innerFrame.stroke({ color: 0xffaa00, alpha: 0.35, width: 1.5 });
    this.addChild(innerFrame);

    // 3. Плашка заголовка "КОЛЛЕКЦИЯ КОТИКОВ (N/15)"
    const headerBg = new Graphics();
    headerBg.roundRect(cardX + 40, cardY + 12, cardW - 80, 36, 12);
    headerBg.fill(0x281e4c);
    headerBg.stroke({ color: 0xffd700, width: 1.5 });
    this.addChild(headerBg);

    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#ffd700',
      dropShadow: { color: '#000000', alpha: 0.8, blur: 2, distance: 1 }
    });
    const title = new Text({
      text: `${getWorldTitle(this.viewWorld).toUpperCase()} (${this.maxUnlockedLevel}/15)`,
      style: titleStyle
    });
    title.anchor.set(0.5, 0.5);
    title.position.set(W / 2, cardY + 30);
    this.addChild(title);

    // Подзаголовок
    const subStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 10,
      fill: '#a78bfa',
      fontWeight: 'bold'
    });
    const subTitle = new Text({ text: 'СОБЕРИ ВСЕХ УНИКАЛЬНЫХ КОТИКОВ!', style: subStyle });
    subTitle.anchor.set(0.5, 0);
    subTitle.position.set(W / 2, cardY + 52);
    this.addChild(subTitle);

    if (this.worldsCleared >= 1) {
      const tabW = 90;
      ['Луга', 'Дюны'].forEach((label, i) => {
        const world = i + 1;
        const btn = UIUtils.createButton(
          W / 2 - 96 + i * 102,
          cardY + 70,
          tabW,
          28,
          label,
          world === this.viewWorld ? 0xFF6B6B : 0x3d356c,
          () => {
            this.viewWorld = world;
            this._draw();
          }
        );
        this.addChild(btn);
      });
    }

    // Кнопка закрытия ✕
    const closeBtn = new Graphics();
    closeBtn.circle(cardX + cardW - 24, cardY + 24, 14);
    closeBtn.fill(0xff5e62);
    closeBtn.stroke({ color: '#ffffff', width: 1.5 });
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    this.addChild(closeBtn);

    const xTextStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    const xText = new Text({ text: '✕', style: xTextStyle });
    xText.anchor.set(0.5, 0.5);
    xText.position.set(cardX + cardW - 24, cardY + 24);
    xText.eventMode = 'none';
    this.addChild(xText);

    // 4. Сетка 3x5 золотых карточек
    const cols = 3;
    const slotW = 108;
    const slotH = this.worldsCleared >= 1 ? 88 : 96;
    const padX = 12;
    const padY = this.worldsCleared >= 1 ? 6 : 10;
    const gridStartX = cardX + (cardW - (cols * slotW + (cols - 1) * padX)) / 2;
    const gridStartY = cardY + (this.worldsCleared >= 1 ? 100 : 70);

    for (let level = 1; level <= 15; level++) {
      const col = (level - 1) % cols;
      const row = Math.floor((level - 1) / cols);

      const slotX = gridStartX + col * (slotW + padX);
      const slotY = gridStartY + row * (slotH + padY);

      const isUnlocked = level <= this.maxUnlockedLevel;
      const catData = getCatData(level);

      const slotContainer = new Container();
      slotContainer.position.set(slotX, slotY);

      const slotBg = new Graphics();
      slotBg.roundRect(0, 0, slotW, slotH, 12);

      if (isUnlocked) {
        slotBg.fill(catData.color || 0x3b2d6b);
        slotBg.stroke({ color: 0xffd700, width: 2.0 });
        slotContainer.eventMode = 'static';
        slotContainer.cursor = 'pointer';

        slotContainer.on('pointerdown', (e) => {
          e.stopPropagation();
          this._openCatDetail(level);
        });
      } else {
        slotBg.fill(0x191533);
        slotBg.stroke({ color: 0x362f59, width: 1.5 });
      }
      slotContainer.addChild(slotBg);

      if (isUnlocked) {
        // 1. Аура редкости (для 5+ уровней)
        if (level >= 5) {
          let auraColor = 0x9b59b6;
          let strokeColor = 0xc084fc;
          if (level >= 9 && level <= 12) {
            auraColor = 0xffd700;
            strokeColor = 0xfbbf24;
          } else if (level >= 13) {
            auraColor = 0x00f2fe;
            strokeColor = 0x38bdf8;
          }
          const rarityAura = new Graphics();
          rarityAura.ellipse(slotW / 2, slotH - 45, 24, 8);
          rarityAura.fill({ color: auraColor, alpha: 0.4 });
          rarityAura.stroke({ color: strokeColor, width: 1, alpha: 0.8 });
          slotContainer.addChild(rarityAura);
        }

        // 2. Овальный подставка-glow
        const baseGlow = new Graphics();
        baseGlow.ellipse(slotW / 2, slotH - 45, 22, 8);
        baseGlow.fill({ color: catData.color || 0xffd700, alpha: 0.7 });
        slotContainer.addChild(baseGlow);

        // Спрайт котика
        const texture = getCatTexture(level);
        if (texture) {
          const sprite = new Sprite(texture);
          const spriteSize = 52;
          sprite.width = spriteSize;
          sprite.height = spriteSize;
          sprite.x = (slotW - spriteSize) / 2;
          sprite.y = 4;
          slotContainer.addChild(sprite);
        }

        // Название котика ("Рыжик", "Кот-Бизнесмен" и т.д.)
        const nameStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 10,
          fontWeight: 'bold',
          fill: '#ffffff'
        });
        const catNameText = new Text({
          text: catData.name || `Кот Lvl ${level}`,
          style: nameStyle
        });
        catNameText.anchor.set(0.5, 0);
        catNameText.position.set(slotW / 2, 52);
        slotContainer.addChild(catNameText);

        // Звёздочки ⭐
        const starsStyle = new TextStyle({ fontSize: 9 });
        const starsText = new Text({ text: '⭐⭐⭐', style: starsStyle });
        starsText.anchor.set(0.5, 0);
        starsText.position.set(slotW / 2, 66);
        slotContainer.addChild(starsText);

        // Доход в секунду
        const incStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 9,
          fontWeight: 'bold',
          fill: '#2ecc71'
        });
        const incText = new Text({ text: `+${catData.income}/с`, style: incStyle });
        incText.anchor.set(0.5, 0);
        incText.position.set(slotW / 2, 79);
        slotContainer.addChild(incText);
      } else {
        // Замочек 🔒
        const lockStyle = new TextStyle({ fontSize: 24 });
        const lockEmoji = new Text({ text: '🔒', style: lockStyle });
        lockEmoji.anchor.set(0.5, 0.5);
        lockEmoji.position.set(slotW / 2, 36);
        slotContainer.addChild(lockEmoji);

        const secretStyle = new TextStyle({
          fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
          fontSize: 10,
          fill: '#6b7280',
          fontWeight: 'bold'
        });
        const secretText = new Text({ text: `Lvl ${level}`, style: secretStyle });
        secretText.anchor.set(0.5, 0);
        secretText.position.set(slotW / 2, 64);
        slotContainer.addChild(secretText);
      }

      this.addChild(slotContainer);
    }

    // 5. Кнопка "Закрыть"
    const btnW = 160;
    const btnH = 38;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + cardH - 46;

    const btnBg = new Graphics();
    btnBg.roundRect(btnX, btnY, btnW, btnH, 12);
    btnBg.fill(0xff5e62);
    btnBg.stroke({ color: '#ffffff', alpha: 0.6, width: 1.5 });
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';

    btnBg.on('pointerdown', (e) => {
      e.stopPropagation();
      this._close();
    });
    this.addChild(btnBg);

    const btnStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    const btnText = new Text({ text: 'ЗАКРЫТЬ', style: btnStyle });
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(W / 2, btnY + btnH / 2);
    btnText.eventMode = 'none';
    this.addChild(btnText);
  }

  _openCatDetail(level) {
    const detailModal = new CatDetailModal(this.app, level);
    this.addChild(detailModal);
  }

  _close() {
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
    this.destroy({ children: true });
  }
}

export default CollectionModal;
