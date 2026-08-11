import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { showRewardedAd } from '../api/client.js';
import { saveProgress } from '../api/client.js';

/**
 * TASK-058: Модальное окно Офлайн-Дохода «⏰ С Возвращением!» с возможностью удваивания/утраивания за VK Ads
 */
export class OfflineEarningsModal extends Container {
  /**
   * @param {PIXI.Application} app 
   * @param {Economy} economy 
   * @param {number} baseCoins - базовый пассивный доход за время отсутствия
   * @param {number} offlineMinutes - сколько минут провёл офлайн
   * @param {Function} onClaimed - колбэк после зачисления средств
   */
  constructor(app, economy, baseCoins, offlineMinutes = 5, onClaimed) {
    super();
    this.app = app;
    this.economy = economy;
    this.baseCoins = Math.max(10, Math.round(baseCoins || 0));
    this.tripleCoins = Math.round(this.baseCoins * 3);
    this.offlineMinutes = Math.max(1, Math.round(offlineMinutes || 1));
    this.onClaimed = onClaimed || (() => {});

    this._draw();
  }

  _draw() {
    this.removeChildren();

    const width = CONFIG.GAME_WIDTH || 409;
    const height = CONFIG.GAME_HEIGHT || 667;

    // 1. Полупрозрачный экранирующий щит (static оверлей без блокировки событий внутри модалки)
    const overlay = new Graphics();
    overlay.rect(0, 0, width, height);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    this.addChild(overlay);

    // 2. Окно в стиле Glassmorphism
    const modalW = 340;
    const modalH = 340;
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102a);
    bg.stroke({ color: 0xffd700, width: 2.5 });
    this.addChild(bg);

    const font = CONFIG.FONT_FAMILY || 'Fredoka, sans-serif';

    // 3. Иконка Часов / Награды
    const clockIcon = new Text({
      text: '⏰',
      style: new TextStyle({ fontSize: 44 })
    });
    clockIcon.anchor.set(0.5);
    clockIcon.position.set(width / 2, modalY + 38);
    this.addChild(clockIcon);

    // 4. Заголовок
    const titleStyle = new TextStyle({
      fontFamily: font,
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 3 }
    });
    const title = new Text({ text: 'С ВОЗВРАЩЕНИЕМ!', style: titleStyle });
    title.anchor.set(0.5);
    title.position.set(width / 2, modalY + 76);
    this.addChild(title);

    // 5. Подзаголовок (время отсутствия)
    const timeStr = this.offlineMinutes >= 60 
      ? `${Math.floor(this.offlineMinutes / 60)} ч ${this.offlineMinutes % 60} мин`
      : `${this.offlineMinutes} мин`;

    const subStyle = new TextStyle({
      fontFamily: font,
      fontSize: 13,
      fill: '#a0a7ba',
      align: 'center'
    });
    const subText = new Text({
      text: `Котики работали без вас ${timeStr} и накопили:`,
      style: subStyle
    });
    subText.anchor.set(0.5);
    subText.position.set(width / 2, modalY + 104);
    this.addChild(subText);

    // 6. Плашка базового дохода
    const baseBoxW = 280;
    const baseBoxH = 46;
    const baseBoxX = (width - baseBoxW) / 2;
    const baseBoxY = modalY + 128;

    const baseBoxBg = new Graphics();
    baseBoxBg.roundRect(baseBoxX, baseBoxY, baseBoxW, baseBoxH, 14);
    baseBoxBg.fill(0x221a42);
    baseBoxBg.stroke({ color: 0xffd700, alpha: 0.5, width: 1.5 });
    this.addChild(baseBoxBg);

    const formattedBase = this._formatNum(this.baseCoins);
    const amountStyle = new TextStyle({
      fontFamily: font,
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#ffd700',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2 }
    });
    const amountText = new Text({ text: `+${formattedBase}`, style: amountStyle });
    amountText.anchor.set(0, 0.5);
    
    const coinIcon = UIUtils.createCoinIcon(12);
    const totalW = amountText.width + 28;
    const startX = (width - totalW) / 2;

    amountText.position.set(startX, baseBoxY + 23);
    coinIcon.position.set(startX + amountText.width + 14, baseBoxY + 23);

    this.addChild(amountText);
    this.addChild(coinIcon);

    // 7. Кнопка «🎬 ЗАБРАТЬ x3» (Сочно-зелёная с монетами)
    const formattedTriple = this._formatNum(this.tripleCoins);
    const btnW = 280;
    const btnH = 50;

    const x3Btn = UIUtils.createButton(
      (width - btnW) / 2,
      modalY + 192,
      btnW,
      btnH,
      `🎬 ЗАБРАТЬ x3 (${formattedTriple} 💰)`,
      0x2ecc71,
      async () => {
        await this._handleClaim(true);
      }
    );
    this.addChild(x3Btn);

    // 8. Кнопка «Забрать обычно»
    const claimNormalBtn = UIUtils.createButton(
      (width - btnW) / 2,
      modalY + 256,
      btnW,
      40,
      `Забрать обычно (+${formattedBase} 💰)`,
      0x7f8c8d,
      async () => {
        await this._handleClaim(false);
      }
    );
    this.addChild(claimNormalBtn);
  }

  _formatNum(n) {
    return UIUtils.formatNumber(n);
  }

  async _handleClaim(isTriple = false) {
    if (this._isClaiming) return;
    this._isClaiming = true;

    let earned = this.baseCoins;

    if (isTriple) {
      // Запускаем просмотр рекламы VK Ads для утраивания
      if (typeof window !== 'undefined' && window.vkBridge && typeof window.vkBridge.send === 'function') {
        const adRes = await showRewardedAd();
        if (adRes && adRes.success) {
          earned = this.tripleCoins;
        } else {
          // Если игрок отменил просмотр или произошёл сбой VK SDK — показываем тост и разрешаем попробовать снова
          this._isClaiming = false;
          const stage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
          if (stage) {
            UIUtils.showToast(stage, adRes ? `⚠️ VK Ads: ${adRes.reason}` : '⚠️ Просмотр отменён');
          }
          return;
        }
      } else {
        // В автономной веб-версии выдаём 3x прямо за тест
        earned = this.tripleCoins;
      }
    }

    if (this.economy) {
      this.economy.coins += earned;
      if (typeof this.economy._notify === 'function') {
        this.economy._notify();
      }
    }

    try {
      await saveProgress({
        coins: this.economy ? this.economy.coins : undefined,
        gems: this.economy ? this.economy.gems : undefined
      });
    } catch (e) {}

    const stage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
    if (stage) {
      UIUtils.showToast(stage, `+${this._formatNum(earned)} 💰 начислено! ⚡`);
    }

    this._close();
    this.onClaimed(earned);
  }

  _close() {
    if (this.parent) {
      this.parent.removeChild(this);
    }
    this.destroy({ children: true });
  }
}

export default OfflineEarningsModal;
