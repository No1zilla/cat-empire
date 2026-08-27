import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { RUBY_PACKS, EDICT_PACK } from '../config/rubyShop.js';
import { eventTracker } from '../analytics/EventTracker.js';
import { empireMeta, EDICT } from '../game/EmpireMeta.js';
import { getPlatform } from '../platform/index.js';
import { wasOrderProcessed, markOrderProcessed } from '../game/orderLedger.js';
import { StarterTributeModal } from './StarterTributeModal.js';
import { storageService } from '../services/StorageService.js';

export const RUBY_PACK_BTN_H = 70;
export const RUBY_PACK_BTN_GAP = 14;

/** Подписи пака — дети кнопки. Иначе текст сверху съедает тап и жмётся только кайма. */
export function mountPackCaption(btn, width, titleText, priceText, font) {
  if (!btn) return btn;
  (btn.children || []).forEach((child) => {
    if (child instanceof Text) child.visible = false;
  });
  const packTitle = new Text({
    text: titleText,
    style: new TextStyle({
      fontFamily: font,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.45, blur: 2, distance: 1 }
    })
  });
  packTitle.eventMode = 'none';
  packTitle.anchor.set(0.5, 0);
  packTitle.position.set(width / 2, 12);
  btn.addChild(packTitle);

  const packPrice = new Text({
    text: priceText,
    style: new TextStyle({
      fontFamily: font,
      fontSize: 12,
      fill: TOKENS.colors.gold
    })
  });
  packPrice.eventMode = 'none';
  packPrice.anchor.set(0.5, 0);
  packPrice.position.set(width / 2, 38);
  btn.addChild(packPrice);
  return btn;
}

function reinforceShopTap(btn) {
  if (!btn || typeof btn.on !== 'function') return btn;
  btn.on('pointerup', (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    btn.emit('pointertap', e);
  });
  return btn;
}

function votesWord(n) {
  const abs = Math.abs(Number(n) || 0);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'голос';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'голоса';
  return 'голосов';
}

export class RubyShopModal extends Container {
  constructor(app, economy, onClose, source = 'unknown') {
    super();
    this.app = app;
    this.economy = economy;
    this.onClose = onClose || (() => {});
    this._busy = false;
    this.eventMode = 'static';
    this.zIndex = 999999;
    this._draw();
    try { eventTracker.trackShopOpened(source); } catch (e) {}
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
    const showEdict = !empireMeta.isEdictActive();
    const modalH = 430 + (empireMeta.starterOpen ? 54 : 0) + (showEdict ? 52 : 0);
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFF4757, width: 2.5 });
    bg.eventMode = 'none';
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
    title.eventMode = 'none';
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
    sub.eventMode = 'none';
    sub.position.set(W / 2, modalY + 50);
    this.addChild(sub);

    let packsTop = modalY + 92;
    if (empireMeta.starterOpen) {
      const tributeBtn = UIUtils.createButton(
        modalX + 22,
        modalY + 86,
        modalW - 44,
        44,
        'Ларец первого трона · 5 голосов',
        parseInt(TOKENS.colors.gems.replace('#', '0x')),
        () => {
          this._close();
          const modal = new StarterTributeModal(this.app, this.economy, this.onClose, () => {});
          modal.zIndex = 9999999;
          this.app.stage.addChild(modal);
        }
      );
      reinforceShopTap(tributeBtn);
      this.addChild(tributeBtn);
      packsTop = modalY + 140;
    }

    const btnW = modalW - 44;
    RUBY_PACKS.forEach((pack, index) => {
      const y = packsTop + index * (RUBY_PACK_BTN_H + RUBY_PACK_BTN_GAP);
      const btn = UIUtils.createButton(
        modalX + 22,
        y,
        btnW,
        RUBY_PACK_BTN_H,
        '',
        index === 1 ? parseInt(TOKENS.colors.gems.replace('#', '0x')) : 0x3d356c,
        () => this._buy(pack)
      );
      btn.hitArea = new Rectangle(-10, -8, btnW + 20, RUBY_PACK_BTN_H + 16);
      mountPackCaption(
        btn,
        btnW,
        `${pack.title}  ·  ${UIUtils.formatRubies(pack.rubies)}`,
        `${pack.votes} ${votesWord(pack.votes)} VK  ·  ${pack.hint}`,
        font
      );
      reinforceShopTap(btn);
      this.addChild(btn);
    });

    if (showEdict) {
      const edictY = packsTop + RUBY_PACKS.length * (RUBY_PACK_BTN_H + RUBY_PACK_BTN_GAP);
      const edictBtn = UIUtils.createButton(
        modalX + 22,
        edictY,
        modalW - 44,
        44,
        `Указ семи ночей · ${EDICT.votes} голосов`,
        parseInt(TOKENS.colors.gems.replace('#', '0x')),
        () => this._buyEdict()
      );
      reinforceShopTap(edictBtn);
      this.addChild(edictBtn);
    }

    const closeBtn = UIUtils.createButton(
      modalX + (modalW - 160) / 2,
      modalY + modalH - 52,
      160,
      36,
      'ЗАКРЫТЬ',
      0x3d356c,
      () => this._close()
    );
    reinforceShopTap(closeBtn);
    this.addChild(closeBtn);
  }

  async _buy(pack) {
    if (this._busy) return;
    this._busy = true;
    const stage = this.app && this.app.stage ? this.app.stage : this.parent;

    // Пара к iap_purchase_completed: разница между ними и есть отвал на оплате
    try {
      eventTracker.trackPurchaseInitiated(
        pack && pack.id,
        pack && pack.votes,
        pack && pack.rubies
      );
    } catch (e) {}

    try {
      const result = await getPlatform().purchase(pack.id);
      if (!result || result.cancelled) {
        if (stage) UIUtils.showToast(stage, 'Покупка отменена');
        return;
      }
      if (result.unavailable) {
        if (stage) UIUtils.showToast(stage, 'Покупки здесь недоступны');
        return;
      }
      if (!result.ok) {
        if (stage) UIUtils.showToast(stage, 'Оплата не прошла');
        return;
      }

      const orderId = result.orderId || `${pack.id}:${Date.now()}`;
      if (wasOrderProcessed(orderId)) {
        if (stage) UIUtils.showToast(stage, 'Этот заказ уже зачислен');
        return;
      }

      // За звёзды Telegram рубины уже начислил вебхук — локально добавлять нельзя.
      if (result.serverGranted) {
        await storageService.syncGemsFromServer(this.economy);
      } else if (this.economy) {
        this.economy.addGems(pack.rubies);
      }

      // TASK-109/112: сохранить ДО того, как пометить заказ обработанным. Раньше заказ
      // сжигался первым, а падение записи глоталось молча: игрок платил голосами,
      // видел успех, рубины исчезали при следующей загрузке — и вернуть их было
      // нельзя, wasOrderProcessed уже отвечал «зачислено».
      let saved = true;
      try {
        await storageService.persistCurrency({ gems: this.economy ? this.economy.gems : undefined });
      } catch (e) {
        saved = false;
        console.error('Покупка: рубины не сохранились', e);
      }

      if (!saved) {
        // Заказ НЕ помечаем: VK отдаст тот же orderId, и начисление можно повторить.
        eventTracker.track('iap_grant_failed', { pack: pack.id, rubies: pack.rubies });
        if (stage) UIUtils.showToast(stage, 'Рубины не сохранились. Открой игру ещё раз');
        this._close();
        return;
      }

      markOrderProcessed(orderId);
      eventTracker.track('iap_purchase_completed', {
        pack: pack.id,
        votes: pack.votes,
        rubies: pack.rubies
      });
      if (stage) UIUtils.showToast(stage, `+${UIUtils.formatRubies(pack.rubies)} на баланс`);
      this._close();
    } catch (e) {
      console.warn('Ruby shop buy error:', e);
      if (stage) UIUtils.showToast(stage, 'Не удалось открыть оплату');
    } finally {
      this._busy = false;
    }
  }

  async _buyEdict() {
    if (this._busy || empireMeta.isEdictActive()) return;
    this._busy = true;
    const stage = this.app && this.app.stage ? this.app.stage : this.parent;
    try {
      const result = await getPlatform().purchase(EDICT_PACK.id);
      if (result.cancelled) {
        if (stage) UIUtils.showToast(stage, 'Покупка отменена');
        return;
      }
      if (result.unavailable) {
        if (stage) UIUtils.showToast(stage, 'Покупки здесь недоступны');
        return;
      }
      if (!result.ok) {
        if (stage) UIUtils.showToast(stage, 'Оплата не прошла');
        return;
      }

      const orderId = result.orderId || `${EDICT_PACK.id}:${Date.now()}`;
      if (wasOrderProcessed(orderId)) {
        if (stage) UIUtils.showToast(stage, 'Этот заказ уже зачислен');
        return;
      }

      if (result.serverGranted) {
        await storageService.syncGemsFromServer(this.economy);
      } else if (this.economy) {
        this.economy.addGems(EDICT.rubies);
      }
      empireMeta.activateEdict();

      // TASK-112: заказ сжигаем только после подтверждённого сохранения. Раньше это
      // делала сама покупка, до записи — оплаченный указ мог пропасть без возврата.
      try {
        await storageService.persistCurrency({ gems: this.economy ? this.economy.gems : undefined });
      } catch (e) {
        console.error('Указ: рубины не сохранились', e);
        eventTracker.track('iap_grant_failed', { pack: 'edict', rubies: EDICT.rubies });
        if (stage) UIUtils.showToast(stage, 'Рубины не сохранились. Открой игру ещё раз');
        this._close();
        return;
      }

      markOrderProcessed(orderId);
      eventTracker.track('iap_edict_bought', { rubies: EDICT.rubies });
      if (stage) UIUtils.showToast(stage, 'Указ издан. Семь ночей ×2 и паёк каждый день');
      this._close();
    } catch (e) {
      console.warn('Edict buy error:', e);
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
