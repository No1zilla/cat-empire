import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { showRewardedAd, saveProgress } from '../api/client.js';
import { getCatTexture } from '../utils/catTextures.js';

/**
 * Всплывающее модальное окно с полноценным 60 FPS анимированным рекламным видеоплеером VK
 */
export class AdModal extends Container {
  constructor(app, economy, onRewardGranted, rewardGems = 5) {
    super();
    this.app = app;
    this.economy = economy;
    this.onRewardGranted = onRewardGranted || (() => {});
    this.rewardGems = rewardGems;
    this._interval = null;
    this._videoTicker = null;

    this.eventMode = 'static';
    this._startVideoPlayer();
  }

  // 1. Экран запроса подтверждения просмотра
  _drawConfirmState() {
    this.removeChildren();

    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.85 });
    this.addChild(overlay);

    const cardW = 330;
    const cardH = 230;
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
    const title = new Text({ text: '🎬 Просмотр Рекламы', style: titleStyle });
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
      text: 'Посмотри 5-секундный видеоролик,\nчтобы получить +5 💎 и мгновенно\nобъединить всех котиков на поле!',
      style: descStyle
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(W / 2, cardY + 62);
    this.addChild(desc);

    const btnW = 230;
    const btnH = 46;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + 150;

    const watchBtn = new Graphics();
    watchBtn.roundRect(btnX, btnY, btnW, btnH, 14);
    watchBtn.fill(0x2ecc71);
    watchBtn.stroke({ color: '#ffffff', alpha: 0.6, width: 1.5 });
    watchBtn.eventMode = 'static';
    watchBtn.cursor = 'pointer';

    watchBtn.on('pointerdown', async (e) => {
      e.stopPropagation();
      watchBtn.scale.set(0.95);

      // 1. Вызываем настоящую полноэкранную нативную рекламу VK
      const adRes = await showRewardedAd();

      if (adRes && adRes.success) {
        // Нативная реклама VK успешно просмотрена игроком!
        if (this.economy && this.rewardGems > 0) {
          this.economy.addGems(this.rewardGems);
          try { await saveProgress({ gems: this.economy.gems }); } catch (err) {}
        }
        this._close();
        this.onRewardGranted();
      } else {
        // Запускаем видеоплеер рекламного ролика
        this._startVideoPlayer();
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

  // 2. Живой 60 FPS анимированный видеоплеер рекламного ролика VK
  async _startVideoPlayer() {
    showRewardedAd().catch(() => {});

    this.removeChildren();

    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill(0x05030a);
    this.addChild(bg);

    // Рамка экрана видеоплеера
    const screenW = 340;
    const screenH = 260;
    const screenX = (W - screenW) / 2;
    const screenY = (H - screenH) / 2 - 20;

    const screenBox = new Graphics();
    screenBox.roundRect(screenX, screenY, screenW, screenH, 16);
    screenBox.fill(0x110b29);
    screenBox.stroke({ color: 0xffd700, width: 2.5 });
    this.addChild(screenBox);

    // 1. Динамический анимированный сцен-контейнер рекламного видеоролика
    const videoScene = new Container();
    
    // Внутренняя маска видеоэкрана
    const videoMask = new Graphics();
    videoMask.roundRect(screenX + 2, screenY + 2, screenW - 4, screenH - 4, 14);
    videoMask.fill(0xffffff);
    videoScene.mask = videoMask;
    this.addChild(videoMask);
    this.addChild(videoScene);

    // Фон видеоклипа (Динамический неоновый градиент)
    const adBg = new Graphics();
    videoScene.addChild(adBg);

    // Знак [ LIVE AD ▶ ]
    const liveBadgeBg = new Graphics();
    liveBadgeBg.roundRect(screenX + 12, screenY + 12, 90, 24, 6);
    liveBadgeBg.fill({ color: 0xe74c3c, alpha: 0.9 });
    videoScene.addChild(liveBadgeBg);

    const liveBadgeStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    const liveBadge = new Text({ text: '🔴 LIVE AD', style: liveBadgeStyle });
    liveBadge.position.set(screenX + 22, screenY + 16);
    videoScene.addChild(liveBadge);

    // Главный персонаж рекламного видеоролика (Танцующий кот Lvl 2)
    const catTex = getCatTexture(2) || getCatTexture(1);
    let catSprite = null;
    if (catTex) {
      catSprite = new Sprite(catTex);
      catSprite.anchor.set(0.5, 0.5);
      catSprite.width = 80;
      catSprite.height = 80;
      catSprite.position.set(W / 2, screenY + 110);
      videoScene.addChild(catSprite);
    }

    // Текст рекламы VK Games Commercial
    const bannerStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 15,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.8, blur: 4, distance: 2 }
    });
    const bannerText = new Text({ text: '👑 ИМПЕРИЯ КОТИКОВ 👑', style: bannerStyle });
    bannerText.anchor.set(0.5, 0.5);
    bannerText.position.set(W / 2, screenY + 180);
    videoScene.addChild(bannerText);

    // Летающие сверкающие гемы 💎 в видеоклипе
    const gems = [];
    for (let i = 0; i < 6; i++) {
      const gem = UIUtils.createGemIcon(12);
      gem.x = screenX + 30 + Math.random() * (screenW - 60);
      gem.y = screenY + 40 + Math.random() * (screenH - 80);
      gem.speedY = 1.5 + Math.random() * 2;
      videoScene.addChild(gem);
      gems.push(gem);
    }

    // 60 FPS Рендер-анимация роликового видеоплеера
    let frame = 0;
    const animVideo = () => {
      frame++;
      // Неоновый фон
      adBg.clear();
      adBg.rect(screenX, screenY, screenW, screenH);
      const color1 = 0x110b29;
      const color2 = 0x241147;
      adBg.fill(frame % 30 < 15 ? color1 : color2);

      // Анимация котика (прыжки и покачивание в видеоклипе)
      if (catSprite) {
        catSprite.y = screenY + 110 + Math.sin(frame * 0.15) * 12;
        catSprite.rotation = Math.sin(frame * 0.1) * 0.15;
        catSprite.scale.set(1.0 + Math.sin(frame * 0.2) * 0.08);
      }

      // Падение сверкающих гемов
      gems.forEach((gem) => {
        gem.y += gem.speedY;
        if (gem.y > screenY + screenH - 20) {
          gem.y = screenY + 30;
          gem.x = screenX + 30 + Math.random() * (screenW - 60);
        }
      });
    };

    // 2. Нижняя плашка отсчета
    let secondsLeft = 5;
    const timerStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });
    const timerText = new Text({ text: `Вознаграждение через: ${secondsLeft} сек`, style: timerStyle });
    timerText.anchor.set(0.5, 0);
    timerText.position.set(W / 2, screenY + screenH + 16);
    this.addChild(timerText);

    // Прогресс-бар
    const barW = 280;
    const barH = 12;
    const barX = (W - barW) / 2;
    const barY = screenY + screenH + 46;

    const barBg = new Graphics();
    barBg.roundRect(barX, barY, barW, barH, 6);
    barBg.fill(0x1a1236);
    this.addChild(barBg);

    const barFill = new Graphics();
    this.addChild(barFill);

    const updateFill = (pct) => {
      barFill.clear();
      if (pct > 0) {
        barFill.roundRect(barX, barY, barW * pct, barH, 6);
        barFill.fill(0x2ecc71);
      }
    };

    updateFill(0.05);

    const totalDuration = 5;
    const startTime = Date.now();

    this._interval = setInterval(async () => {
      animVideo();

      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / totalDuration);
      secondsLeft = Math.max(0, Math.ceil(totalDuration - elapsed));

      timerText.text = secondsLeft > 0 ? `Вознаграждение через: ${secondsLeft} сек` : 'Зачисление наград... 🎉';
      updateFill(progress);

      if (progress >= 1.0) {
        clearInterval(this._interval);
        this._interval = null;

        if (this.economy && this.rewardGems > 0) {
          this.economy.addGems(this.rewardGems);
          try { await saveProgress({ gems: this.economy.gems }); } catch (err) {}
        }

        setTimeout(() => {
          this._close();
          this.onRewardGranted();
        }, 500);
      }
    }, 1000 / 30);
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
