import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { showRewardedAd, saveProgress } from '../api/client.js';

/**
 * Всплывающее модальное окно с интерактивным плеером 5-секундного рекламного видеоролика VK
 */
export class AdModal extends Container {
  constructor(app, economy, onRewardGranted) {
    super();
    this.app = app;
    this.economy = economy;
    this.onRewardGranted = onRewardGranted || (() => {});
    this._interval = null;

    this.eventMode = 'static';
    this._drawConfirmState();
  }

  // 1. Экран запроса подтверждения просмотра
  _drawConfirmState() {
    this.removeChildren();

    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.8 });
    this.addChild(overlay);

    const cardW = 320;
    const cardH = 220;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 20);
    card.fill(0x16132d);
    card.stroke({ color: 0xffd700, width: 2.0 });
    this.addChild(card);

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

    const descStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fill: '#ffffff',
      align: 'center',
      lineHeight: 20
    });
    const desc = new Text({
      text: 'Посмотри короткий видеоролик,\nчтобы получить +5 💎 и мгновенно\nобъединить всех котиков на поле!',
      style: descStyle
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(W / 2, cardY + 60);
    this.addChild(desc);

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

    watchBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this._startVideoPlayer();
    });

    this.addChild(watchBtn);

    const btnTextStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const btnText = new Text({ text: '🎬 Смотреть Видео (+5 💎)', style: btnTextStyle });
    btnText.anchor.set(0.5, 0.5);
    btnText.position.set(W / 2, btnY + btnH / 2);
    btnText.eventMode = 'none';
    this.addChild(btnText);

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

  // 2. Экран воспроизведения 5-секундного рекламного видеоролика VK
  async _startVideoPlayer() {
    // Вызываем нативную рекламу VK Bridge на мобильных устройствах
    showRewardedAd().catch(() => {});

    this.removeChildren();

    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill(0x0a0718);
    this.addChild(bg);

    // Рамка видеоплеера
    const playerW = 340;
    const playerH = 260;
    const playerX = (W - playerW) / 2;
    const playerY = (H - playerH) / 2;

    const playerBox = new Graphics();
    playerBox.roundRect(playerX, playerY, playerW, playerH, 16);
    playerBox.fill(0x130e28);
    playerBox.stroke({ color: 0x3b82f6, width: 2.0 });
    this.addChild(playerBox);

    // Знак видеоплеера ▶
    const playIconStyle = new TextStyle({ fontSize: 48, fill: '#3b82f6' });
    const playIcon = new Text({ text: '▶ 🎬', style: playIconStyle });
    playIcon.anchor.set(0.5, 0.5);
    playIcon.position.set(W / 2, playerY + 80);
    this.addChild(playIcon);

    const adTitleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    const adTitle = new Text({ text: 'Реклама VK Partner', style: adTitleStyle });
    adTitle.anchor.set(0.5, 0);
    adTitle.position.set(W / 2, playerY + 130);
    this.addChild(adTitle);

    // Таймер обратного отсчета
    let secondsLeft = 5;
    const timerStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });
    const timerText = new Text({ text: `Вознаграждение через: ${secondsLeft} сек`, style: timerStyle });
    timerText.anchor.set(0.5, 0);
    timerText.position.set(W / 2, playerY + 165);
    this.addChild(timerText);

    // Прогресс-бар просмотра
    const barW = 260;
    const barH = 10;
    const barX = (W - barW) / 2;
    const barY = playerY + 205;

    const barBg = new Graphics();
    barBg.roundRect(barX, barY, barW, barH, 5);
    barBg.fill(0x221a40);
    this.addChild(barBg);

    const barFill = new Graphics();
    this.addChild(barFill);

    const updateFill = (pct) => {
      barFill.clear();
      if (pct > 0) {
        barFill.roundRect(barX, barY, barW * pct, barH, 5);
        barFill.fill(0x2ecc71);
      }
    };

    updateFill(0.05);

    const totalDuration = 5;
    const startTime = Date.now();

    this._interval = setInterval(async () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / totalDuration);
      secondsLeft = Math.max(0, Math.ceil(totalDuration - elapsed));

      timerText.text = secondsLeft > 0 ? `Вознаграждение через: ${secondsLeft} сек` : 'Зачисление наград... 🎉';
      updateFill(progress);

      if (progress >= 1.0) {
        clearInterval(this._interval);
        this._interval = null;

        if (this.economy) {
          this.economy.addGems(5);
          try { await saveProgress({ gems: this.economy.gems }); } catch (err) {}
        }

        setTimeout(() => {
          this._close();
          this.onRewardGranted();
        }, 500);
      }
    }, 100);
  }

  _close() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this.parent) this.parent.removeChild(this);
    this.destroy();
  }
}
