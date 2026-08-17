import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { AdModal } from './AdModal.js';
import { empireMeta } from '../game/EmpireMeta.js';
import { getLiveOpsLayout } from '../game/liveOpsLayout.js';
import { rollIdolReward } from '../game/idolRewards.js';
import { incomeBoosterService } from '../game/IncomeBooster.js';
import { saveProgress } from '../api/client.js';
import { eventTracker } from '../analytics/EventTracker.js';

const ROW_H = 32;
const ORANGE = parseInt(TOKENS.colors.btnFill.replace('#', '0x'));
const ORANGE_SHADOW = 0xb35400;
const MUTED = 0x3d356c;
const MUTED_SHADOW = 0x1a1230;
const GREEN = 0x2ecc71;
const GREEN_SHADOW = 0x1e8449;
const PORTAL = 0xFF6B6B;
const PORTAL_SHADOW = 0x8e2a2a;

export class LiveOpsRow extends Container {
  constructor(app, economy, { onBuffs, onPortal, onLayout, idolUnlocked = false } = {}) {
    super();
    this.app = app;
    this.economy = economy;
    this.onBuffs = onBuffs || (() => {});
    this.onPortal = onPortal || (() => {});
    this.onLayout = onLayout || (() => {});
    this.idolUnlocked = Boolean(idolUnlocked);
    this.visibleHeight = 0;
    this._timer = null;
    this._layoutKey = '';
    this._left = null;
    this._right = null;
    this._mode = 'hidden';
    this._tick();
    this._timer = setInterval(() => this._tick(), 1000);
  }

  setIdolUnlocked(value) {
    this.idolUnlocked = Boolean(value);
    this._tick();
  }

  _chip(x, y, w, h, label) {
    const wrap = new Container();
    wrap.position.set(x, y);
    wrap.eventMode = 'static';
    wrap.cursor = 'pointer';
    wrap.hitArea = new Rectangle(0, 0, w, h);

    const shadow = new Graphics();
    shadow.roundRect(0, 3, w, h, 14);
    shadow.fill(ORANGE_SHADOW);
    wrap.addChild(shadow);

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 14);
    bg.fill(ORANGE);
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
    if (!chip) return;
    chip.bg.clear();
    chip.bg.roundRect(0, 0, chip.w, chip.h, 14);
    chip.bg.fill(fill);
    chip.bg.stroke({ color: 0xffffff, alpha: 0.4, width: 1.5 });
    chip.shadow.clear();
    chip.shadow.roundRect(0, 3, chip.w, chip.h, 14);
    chip.shadow.fill(shadow);
    chip.wrap.alpha = active ? 1 : 0.85;
  }

  _rebuild(layout) {
    this.removeChildren();
    this._left = null;
    this._right = null;
    this._mode = layout.mode;
    this.visibleHeight = layout.visible ? ROW_H : 0;
    this.visible = layout.visible;
    if (!layout.visible) return;

    const gap = 10;
    const fullW = CONFIG.GAME_WIDTH - 16;
    const halfW = (fullW - gap) / 2;
    const split = layout.mode === 'split';
    const leftW = split ? halfW : fullW;

    this._left = this._chip(0, 0, leftW, ROW_H, layout.left);
    this.addChild(this._left.wrap);
    this._left.wrap.on('pointertap', () => this._onLeft());

    if (split) {
      this._right = this._chip(halfW + gap, 0, halfW, ROW_H, layout.right);
      this.addChild(this._right.wrap);
      this._right.wrap.on('pointertap', () => this._onRight());
    }
  }

  _paintFromLayout(layout) {
    if (layout.mode === 'portal') {
      this._paint(this._left, true, PORTAL, PORTAL_SHADOW);
      return;
    }
    if (layout.mode === 'ration') {
      this._paint(this._left, true, GREEN, GREEN_SHADOW);
      return;
    }

    const idolLeft = empireMeta.idolRemaining() > 0;
    const idolFill = idolLeft ? ORANGE : MUTED;
    const idolShadow = idolLeft ? ORANGE_SHADOW : MUTED_SHADOW;
    this._paint(this._left, idolLeft, idolFill, idolShadow);

    if (layout.mode === 'split') {
      this._paint(this._right, true, GREEN, GREEN_SHADOW);
    }
  }

  _tick() {
    const layout = getLiveOpsLayout({
      pendingFlight: empireMeta.snapshot().pendingFlight,
      idolUnlocked: this.idolUnlocked,
      idolRemaining: empireMeta.idolRemaining(),
      edictActive: empireMeta.isEdictActive(),
      canClaimDaily: empireMeta.canClaimEdictDaily(),
      edictRemainingMs: empireMeta.edictRemainingMs()
    });
    const key = `${layout.mode}|${layout.left}|${layout.right}|${layout.visible}`;
    if (key !== this._layoutKey) {
      this._layoutKey = key;
      this._rebuild(layout);
      this._paintFromLayout(layout);
      this.onLayout();
      return;
    }
    if (this._left && layout.left) this._left.text.text = layout.left;
    if (this._right && layout.right) this._right.text.text = layout.right;
    this._paintFromLayout(layout);
  }

  _onLeft() {
    if (this._mode === 'portal') {
      this.onPortal();
      return;
    }
    if (this._mode === 'ration') {
      this._claimRation();
      return;
    }
    this._offerIdol();
  }

  _onRight() {
    this._claimRation();
  }

  _offerIdol() {
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

  async _claimRation() {
    const stage = this.app.stage;
    if (!empireMeta.isEdictActive()) return;
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
