import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { showRewardedAd, saveProgress } from '../api/client.js';

/**
 * Всплывающее модальное окно для просмотра VK Rewarded Ads при нехватке гемов
 */
export class AdModal extends Container {
  constructor(app, economy, onRewardGranted) {
    super();
    this.app = app;
    this.economy = economy;
    this.onRewardGranted = onRewardGranted || (() => {});

    this.eventMode = 'static';
    this._draw();
  }

  _draw() {
    this.removeChildren();

    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // 1. Полупрозрачный темный оверлей
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.75 });
    this.addChild(overlay);

    // 2. Карточка модалки
    const cardW = 320;
    const cardH = 220;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 20);
    card.fill(0x16132d);
    card.stroke({ color: 0xffd700, width: 2.0 });
    this.addChild(card);

    // 3. Заголовок
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });
    const title = new Text({ text: '🎬 Просмотр Рекламы VK', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, cardY + 20);
    this.addChild(title);

    // 4. Описание
    const descStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fill: '#ffffff',
      align: 'center',
      lineHeight: 20
    });
    const desc = new Text({
      text: 'Посмотри короткое видео,\nчтобы получить +5 💎 и мгновенно\nобъединить всех котиков на поле!',
      style: descStyle
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(W / 2, cardY + 60);
    this.addChild(desc);

    // 5. Кнопка "🎬 Смотреть (+5 💎)"
    const btnW = 220;
    const btnH = 44;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + 145;

    const watchBtn = new Graphics();
    watchBtn.roundRect(btnX, btnY, btnW, btnH, 14);
    watchBtn.fill(0x2ecc71);
    watchBtn.stroke({ color: '#ffffff', alpha: 0.6, width: 1.5 });
    watchBtn.eventMode = 'static';
    watchBtn.cursor = 'pointer';

    watchBtn.on('pointerdown', async (e) => {
      e.stopPropagation();
      watchBtn.scale.set(0.95);
      const res = await showRewardedAd();
      if (res && res.success) {
        if (this.economy) {
          this.economy.addGems(5);
          try { await saveProgress({ gems: this.economy.gems }); } catch (err) {}
        }
        this._close();
        this.onRewardGranted();
      } else {
        this._close();
      }
    });

    this.addChild(watchBtn);

    const btnTextStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const btnText = new Text({ text: '🎬 Смотреть (+5 💎)', style: btnTextStyle });
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(W / 2, btnY + btnH / 2);
    btnText.eventMode = 'none';
    this.addChild(btnText);

    // 6. Кнопка закрытия ✕
    const closeBtnStyle = new TextStyle({ fontSize: 18, fill: '#aaaaaa' });
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
  }

  _close() {
    if (this.parent) this.parent.removeChild(this);
    this.destroy();
  }
}
