import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { AdModal } from './AdModal.js';
import { empireMeta, EDICT } from '../game/EmpireMeta.js';
import { rollIdolReward } from '../game/idolRewards.js';
import { incomeBoosterService } from '../game/IncomeBooster.js';
import { purchaseVkItem } from '../game/iapBuy.js';
import { saveProgress } from '../api/client.js';
import { eventTracker } from '../analytics/EventTracker.js';

function formatDays(ms) {
  const d = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return d;
}

export class LiveOpsRow extends Container {
  constructor(app, economy, { onBuffs, onPortal } = {}) {
    super();
    this.app = app;
    this.economy = economy;
    this.onBuffs = onBuffs || (() => {});
    this.onPortal = onPortal || (() => {});
    this._timer = null;
    this._draw();
    this._timer = setInterval(() => this._tick(), 1000);
    this._tick();
  }

  _draw() {
    this.removeChildren();
    const gap = 10;
    const w = (CONFIG.GAME_WIDTH - 16 - gap) / 2;
    const h = 32;

    this._left = this._chip(0, 0, w, h, 'Идол');
    this._right = this._chip(w + gap, 0, w, h, 'Указ');
    this.addChild(this._left.wrap);
    this.addChild(this._right.wrap);

    this._left.wrap.on('pointertap', () => this._onLeft());
    this._right.wrap.on('pointertap', () => this._onRight());
  }

  _chip(x, y, w, h, label) {
    const wrap = new Container();
    wrap.position.set(x, y);
    wrap.eventMode = 'static';
    wrap.cursor = 'pointer';
    wrap.hitArea = new Rectangle(0, 0, w, h);

    const shadow = new Graphics();
    shadow.roundRect(0, 3, w, h, 14);
    shadow.fill(0x9f1239);
    wrap.addChild(shadow);

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 14);
    bg.fill(parseInt(TOKENS.colors.gems.replace('#', '0x')));
    bg.stroke({ color: 0xffffff, alpha: 0.4, width: 1.5 });
    wrap.addChild(bg);

    const shine = new Graphics();
    shine.roundRect(2, 2, w - 4, 12, 10);
    shine.fill({ color: 0xffffff, alpha: 0.18 });
    wrap.addChild(shine);

    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: CONFIG.FONT_FAMILY,
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#ffffff',
        dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
      })
    });
    text.anchor.set(0.5);
    text.position.set(w / 2, h / 2);
    wrap.addChild(text);

    return { wrap, bg, shadow, text, w, h };
  }

  _paint(chip, active, fill, shadow) {
    chip.bg.clear();
    chip.bg.roundRect(0, 0, chip.w, chip.h, 14);
    chip.bg.fill(fill);
    chip.bg.stroke({ color: 0xffffff, alpha: 0.4, width: 1.5 });
    chip.shadow.clear();
    chip.shadow.roundRect(0, 3, chip.w, chip.h, 14);
    chip.shadow.fill(shadow);
    chip.wrap.alpha = active ? 1 : 0.85;
  }

  _tick() {
    const pending = empireMeta.snapshot().pendingFlight;
    const leftLeft = empireMeta.idolRemaining();
    if (pending) {
      this._paint(this._left, true, 0xFF6B6B, 0x8e2a2a);
      this._left.text.text = 'Портал открыт';
    } else if (leftLeft <= 0) {
      this._paint(this._left, false, 0x3d356c, 0x1a1230);
      this._left.text.text = 'Идол сыт';
    } else {
      this._paint(this._left, true, parseInt(TOKENS.colors.gems.replace('#', '0x')), 0x9f1239);
      this._left.text.text = `Идол · ${leftLeft}/3`;
    }

    if (empireMeta.isEdictActive()) {
      this._paint(this._right, true, 0x2ecc71, 0x1e8449);
      const nights = formatDays(empireMeta.edictRemainingMs());
      this._right.text.text = empireMeta.canClaimEdictDaily()
        ? `Паёк · ${nights}н`
        : `Указ · ${nights}н`;
    } else {
      this._paint(this._right, true, parseInt(TOKENS.colors.gems.replace('#', '0x')), 0x9f1239);
      this._right.text.text = 'Указ 7 ночей';
    }
  }

  _onLeft() {
    if (empireMeta.snapshot().pendingFlight) {
      this.onPortal();
      return;
    }
    if (empireMeta.idolRemaining() <= 0) {
      const stage = this.app.stage;
      if (stage) UIUtils.showToast(stage, 'Идол сыт до завтра');
      return;
    }
    const stage = this.app.stage;
    if (!stage) return;
    stage.sortableChildren = true;
    const modal = new AdModal(this.app, this.economy, () => {
      if (!empireMeta.recordIdolOffering()) return;
      const reward = rollIdolReward(Math.random, empireMeta.mint);
      if (reward.rubies) this.economy.addGems(reward.rubies);
      if (reward.boosterMs) incomeBoosterService.activate(Date.now(), reward.boosterMs, true);
      if (reward.mint) empireMeta.addMint(reward.mint);
      this.onBuffs();
      this._tick();
      eventTracker.track('idol_offering_completed', { reward: reward.id });
      try { saveProgress({ gems: this.economy.gems }); } catch (e) {}
      const bits = [];
      if (reward.rubies) bits.push(`+${UIUtils.formatRubies(reward.rubies)}`);
      if (reward.boosterMs) bits.push('рывок ×2 на 10 мин');
      if (reward.mint) bits.push('+1 мята');
      UIUtils.showToast(stage, `${reward.label}: ${bits.join(', ')}`);
    }, 0, 'Подношение идолу через:', true);
    modal.zIndex = 9999999;
    stage.addChild(modal);
  }

  async _onRight() {
    const stage = this.app.stage;
    if (empireMeta.isEdictActive()) {
      const gained = empireMeta.claimEdictDaily();
      if (!gained) {
        if (stage) UIUtils.showToast(stage, 'Паёк уже взят сегодня');
        return;
      }
      this.economy.addGems(gained);
      eventTracker.track('edict_daily_claimed', { rubies: gained });
      try { await saveProgress({ gems: this.economy.gems }); } catch (e) {}
      this.onBuffs();
      this._tick();
      if (stage) UIUtils.showToast(stage, `Паёк указа: +${UIUtils.formatRubies(gained)}`);
      return;
    }
    if (!stage) return;
    const result = await purchaseVkItem(EDICT.id);
    if (result.cancelled) {
      UIUtils.showToast(stage, 'Покупка отменена');
      return;
    }
    if (result.unavailable) {
      UIUtils.showToast(stage, 'Покупки доступны внутри VK');
      return;
    }
    if (!result.ok) {
      UIUtils.showToast(stage, 'Оплата не прошла');
      return;
    }
    this.economy.addGems(EDICT.rubies);
    empireMeta.activateEdict();
    eventTracker.track('iap_edict_bought', { rubies: EDICT.rubies });
    try { await saveProgress({ gems: this.economy.gems }); } catch (e) {}
    this.onBuffs();
    this._tick();
    UIUtils.showToast(stage, 'Указ издан. Семь ночей ×2 и паёк каждый день');
  }

  destroy(options) {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    super.destroy(options);
  }
}

export default LiveOpsRow;
