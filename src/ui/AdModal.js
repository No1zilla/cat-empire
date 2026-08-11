import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { showRewardedAd, saveProgress } from '../api/client.js';
import { getCatTexture } from '../utils/catTextures.js';
import { UIUtils } from '../utils/UIUtils.js';

/**
 * Всплывающее модальное окно с полноценным 60 FPS анимированным рекламным видеоплеером VK
 */
export class AdModal extends Container {
  constructor(app, economy, onRewardGranted, rewardGems = 5, customTitle = null) {
    super();
    this.app = app;
    this.economy = economy;
    this.onRewardGranted = onRewardGranted || (() => {});
    this.rewardGems = rewardGems;
    this.customTitle = customTitle;
    this._interval = null;
    this._videoTicker = null;

    this.eventMode = 'static';
    
    // Блокирующий экран-оверлей при инициализации
    this._drawOverlayShield();
    this._startVideoPlayer();
  }

  // Защитный экранирующий оверлей — предотвращает «проклик» в игровое поле
  _drawOverlayShield() {
    const W = CONFIG.GAME_WIDTH || 375;
    const H = CONFIG.GAME_HEIGHT || 667;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.92 });
    overlay.eventMode = 'static';

    const stopEvt = (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    };

    overlay.on('pointerdown', stopEvt);
    overlay.on('pointerup', stopEvt);
    overlay.on('pointertap', stopEvt);
    overlay.on('tap', stopEvt);
    overlay.on('click', stopEvt);
    overlay.on('touchstart', stopEvt);

    this.addChild(overlay);
  }

  async _startVideoPlayer() {
    // 1. Попытка запустить нативную VK рекламу
    const realAdRes = await showRewardedAd().catch(() => null);
    if (realAdRes && realAdRes.success) {
      if (this.economy && this.rewardGems > 0) {
        this.economy.addGems(this.rewardGems);
        try { await saveProgress({ gems: this.economy.gems }); } catch (err) {}
      }
      this._close();
      if (typeof this.onRewardGranted === 'function') {
        this.onRewardGranted();
      }
      return;
    }

    // 2. Если нативная реклама недоступна — выводим отладочный тост с ошибкой VK SDK и включаем анимированный симулятор плеера
    const stage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
    if (stage && realAdRes && realAdRes.reason) {
      UIUtils.showToast(stage, `⚠️ VK SDK: ${realAdRes.reason}`);
    }

    this.removeChildren();
    this._drawOverlayShield();

    const W = CONFIG.GAME_WIDTH || 375;
    const H = CONFIG.GAME_HEIGHT || 667;

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

    // Кнопка Закрыть ✕ в углу экрана видеоплеера
    const closeBtnStyle = new TextStyle({ fontSize: 20, fill: '#aaaaaa' });
    const closeBtn = new Text({ text: '✕', style: closeBtnStyle });
    closeBtn.anchor.set(0.5, 0.5);
    closeBtn.position.set(screenX + screenW - 16, screenY + 16);
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      this._close();
    });
    closeBtn.on('pointerdown', (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    });
    this.addChild(closeBtn);

    // Динамический сцен-контейнер рекламного видеоролика
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
      adBg.clear();
      adBg.rect(screenX, screenY, screenW, screenH);
      const color1 = 0x110b29;
      const color2 = 0x241147;
      adBg.fill(frame % 30 < 15 ? color1 : color2);

      if (catSprite) {
        catSprite.y = screenY + 110 + Math.sin(frame * 0.15) * 12;
        catSprite.rotation = Math.sin(frame * 0.1) * 0.15;
        catSprite.scale.set(1.0 + Math.sin(frame * 0.2) * 0.08);
      }

      gems.forEach((gem) => {
        gem.y += gem.speedY;
        if (gem.y > screenY + screenH - 20) {
          gem.y = screenY + 30;
          gem.x = screenX + 30 + Math.random() * (screenW - 60);
        }
      });
    };

    // Нижняя плашка отсчета
    let secondsLeft = 5;
    const timerStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center'
    });
    const timerLabel = this.customTitle ? this.customTitle : (this.rewardGems > 0 ? 'Вознаграждение через:' : 'Авто-соединение через:');
    const timerText = new Text({ text: `${timerLabel} ${secondsLeft} сек`, style: timerStyle });
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

      if (this.customTitle) {
        timerText.text = secondsLeft > 0 ? `${this.customTitle} ${secondsLeft} сек` : 'Заполняем котиками... 📦';
      } else if (this.rewardGems > 0) {
        timerText.text = secondsLeft > 0 ? `Вознаграждение через: ${secondsLeft} сек` : 'Начисляем награду... 🎉';
      } else {
        timerText.text = secondsLeft > 0 ? `Авто-соединение через: ${secondsLeft} сек` : 'Соединяем котиков... ⚡';
      }
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
          if (typeof this.onRewardGranted === 'function') {
            this.onRewardGranted();
          }
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

export default AdModal;
