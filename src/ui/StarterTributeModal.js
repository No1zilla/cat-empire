import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { STARTER_TRIBUTE, empireMeta } from '../game/EmpireMeta.js';
import { purchaseVkItem } from '../game/iapBuy.js';
import { incomeBoosterService } from '../game/IncomeBooster.js';
import { eventTracker } from '../analytics/EventTracker.js';
import { AdModal } from './AdModal.js';
import { RUBY_AD_REWARD } from '../config/rubyShop.js';
import { storageService } from '../services/StorageService.js';

export class StarterTributeModal extends Container {
  constructor(app, economy, onGranted, onClose) {
    super();
    this.app = app;
    this.economy = economy;
    this.onGranted = onGranted || (() => {});
    this.onClose = onClose || (() => {});
    this._busy = false;
    this.eventMode = 'static';
    this.zIndex = 9999999;
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

    const modalW = 330;
    const modalH = 340;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFFD15C, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: 'ЛАРЕЦ ПЕРВОГО ТРОНА',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 18,
        fontWeight: 'bold',
        fill: TOKENS.colors.gold
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 36);
    this.addChild(title);

    const sub = new Text({
      text: 'Кото-Бог кидает ларец на дорогу.\nОдин раз: 80 рубинов и час ×2.',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 13,
        fill: '#cfc8e8',
        align: 'center'
      })
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(W / 2, modalY + 64);
    this.addChild(sub);

    const buyBtn = UIUtils.createButton(
      modalX + 24,
      modalY + 128,
      modalW - 48,
      50,
      `Открыть ларец · ${STARTER_TRIBUTE.votes} голосов`,
      parseInt(TOKENS.colors.gems.replace('#', '0x')),
      () => this._buy()
    );
    this.addChild(buyBtn);

    const adBtn = UIUtils.createButton(
      modalX + 24,
      modalY + 186,
      modalW - 48,
      46,
      `Смотреть рекламу (+${RUBY_AD_REWARD})`,
      0x2ecc71,
      () => this._watchAd()
    );
    this.addChild(adBtn);

    const later = UIUtils.createButton(
      modalX + 24,
      modalY + 242,
      modalW - 48,
      40,
      'Потом',
      0x3d356c,
      () => {
        empireMeta.deferStarter();
        this._close();
      }
    );
    this.addChild(later);
  }

  _watchAd() {
    const stage = this.app && this.app.stage ? this.app.stage : this.parent;
    if (!stage) return;
    stage.sortableChildren = true;
    const modal = new AdModal(this.app, this.economy, () => {
      this.onGranted();
      this._close();
    }, RUBY_AD_REWARD, 'Получение рубинов через:');
    modal.zIndex = 9999999;
    stage.addChild(modal);
  }

  async _buy() {
    if (this._busy || !empireMeta.starterOpen) return;
    this._busy = true;
    const stage = this.app && this.app.stage ? this.app.stage : this.parent;
    try {
      const result = await purchaseVkItem(STARTER_TRIBUTE.id);
      if (result.cancelled) {
        if (stage) UIUtils.showToast(stage, 'Покупка отменена');
        return;
      }
      if (result.unavailable) {
        if (stage) UIUtils.showToast(stage, 'Покупки доступны внутри VK');
        return;
      }
      if (result.duplicate) {
        if (stage) UIUtils.showToast(stage, 'Этот заказ уже зачислен');
        return;
      }
      if (!result.ok) {
        if (stage) UIUtils.showToast(stage, 'Оплата не прошла');
        return;
      }
      if (this.economy) this.economy.addGems(STARTER_TRIBUTE.rubies);
      incomeBoosterService.activate(Date.now(), STARTER_TRIBUTE.boosterMs);
      empireMeta.claimStarter();
      try { await storageService.persistCurrency({ gems: this.economy ? this.economy.gems : undefined }); } catch (e) {}
      eventTracker.track('iap_starter_tribute', { rubies: STARTER_TRIBUTE.rubies });
      if (stage) UIUtils.showToast(stage, 'Кото-Бог дал ларец. +80 рубинов и час ×2');
      this.onGranted();
      this._close();
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

export default StarterTributeModal;
