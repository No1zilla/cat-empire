import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { RUBY_PACKS } from '../config/rubyShop.js';
import { saveProgress } from '../api/client.js';
import { eventTracker } from '../analytics/EventTracker.js';
import VKService from '../vk/VKBridge.js';

const PROCESSED_ORDERS_KEY = 'cat_empire_iap_orders';

function votesWord(n) {
  const abs = Math.abs(Number(n) || 0);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'голос';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'голоса';
  return 'голосов';
}

function wasOrderProcessed(orderId) {
  if (!orderId || typeof localStorage === 'undefined') return false;
  try {
    const list = JSON.parse(localStorage.getItem(PROCESSED_ORDERS_KEY) || '[]');
    return Array.isArray(list) && list.includes(String(orderId));
  } catch (e) {
    return false;
  }
}

function markOrderProcessed(orderId) {
  if (!orderId || typeof localStorage === 'undefined') return;
  try {
    const list = JSON.parse(localStorage.getItem(PROCESSED_ORDERS_KEY) || '[]');
    const next = Array.isArray(list) ? list : [];
    next.push(String(orderId));
    localStorage.setItem(PROCESSED_ORDERS_KEY, JSON.stringify(next.slice(-40)));
  } catch (e) {}
}

export class RubyShopModal extends Container {
  constructor(app, economy, onClose) {
    super();
    this.app = app;
    this.economy = economy;
    this.onClose = onClose || (() => {});
    this.vkService = new VKService();
    this._busy = false;
    this.eventMode = 'static';
    this.zIndex = 999999;
    this._draw();
  }

  _draw() {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const font = TOKENS.typography.fontFamily;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(overlay);

    const modalW = 340;
    const modalH = 430;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFF4757, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: 'МАГАЗИН РУБИНОВ',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#FFD15C',
        dropShadow: { color: '#000000', alpha: 0.7, blur: 4 }
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 28);
    this.addChild(title);

    const sub = new Text({
      text: 'Покупка за голоса VK. Рубины сразу на баланс.',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 12,
        fill: TOKENS.colors.textSecondary,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 300
      })
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(W / 2, modalY + 50);
    this.addChild(sub);

    RUBY_PACKS.forEach((pack, index) => {
      const y = modalY + 96 + index * 84;
      const btn = UIUtils.createButton(
        modalX + 22,
        y,
        modalW - 44,
        70,
        '',
        index === 1 ? parseInt(TOKENS.colors.gems.replace('#', '0x')) : 0x3d356c,
        () => this._buy(pack)
      );
      this.addChild(btn);

      const packTitle = new Text({
        text: `${pack.title}  ·  ${UIUtils.formatRubies(pack.rubies)}`,
        style: new TextStyle({
          fontFamily: font,
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#ffffff',
          dropShadow: { color: '#000000', alpha: 0.45, blur: 2, distance: 1 }
        })
      });
      packTitle.anchor.set(0.5, 0);
      packTitle.position.set(W / 2, y + 12);
      this.addChild(packTitle);

      const packPrice = new Text({
        text: `${pack.votes} ${votesWord(pack.votes)} VK  ·  ${pack.hint}`,
        style: new TextStyle({
          fontFamily: font,
          fontSize: 12,
          fill: TOKENS.colors.gold
        })
      });
      packPrice.anchor.set(0.5, 0);
      packPrice.position.set(W / 2, y + 38);
      this.addChild(packPrice);
    });

    const closeBtn = UIUtils.createButton(
      modalX + (modalW - 160) / 2,
      modalY + modalH - 52,
      160,
      36,
      'ЗАКРЫТЬ',
      0x3d356c,
      () => this._close()
    );
    this.addChild(closeBtn);
  }

  async _buy(pack) {
    if (this._busy) return;
    this._busy = true;
    const stage = this.app && this.app.stage ? this.app.stage : this.parent;

    try {
      const result = await this.vkService.showOrderBox(pack.id);
      if (!result || result.cancelled) {
        if (stage) UIUtils.showToast(stage, 'Покупка отменена');
        return;
      }
      if (result.unavailable) {
        if (stage) UIUtils.showToast(stage, 'Покупки доступны внутри VK');
        return;
      }
      if (!result.success) {
        if (stage) UIUtils.showToast(stage, 'Оплата не прошла');
        return;
      }

      const orderId = result.orderId || `${pack.id}:${Date.now()}`;
      if (wasOrderProcessed(orderId)) {
        if (stage) UIUtils.showToast(stage, 'Этот заказ уже зачислен');
        return;
      }

      if (this.economy) this.economy.addGems(pack.rubies);
      markOrderProcessed(orderId);
      try { await saveProgress({ gems: this.economy ? this.economy.gems : undefined }); } catch (e) {}
      eventTracker.track('iap_purchase_completed', {
        pack: pack.id,
        votes: pack.votes,
        rubies: pack.rubies
      });
      if (stage) UIUtils.showToast(stage, `+${UIUtils.formatRubies(pack.rubies)} на баланс`);
      this._close();
    } catch (e) {
      console.warn('Ruby shop buy error:', e);
      if (stage) UIUtils.showToast(stage, 'Не удалось открыть оплату VK');
    } finally {
      this._busy = false;
    }
  }

  _close() {
    if (typeof this.onClose === 'function') this.onClose();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default RubyShopModal;
