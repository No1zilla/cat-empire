import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { ACTION_ROW_MARGIN } from './actionRowLayout.js';
import { UIUtils } from '../utils/UIUtils.js';
import { empireMeta } from '../game/EmpireMeta.js';
import { getLiveOpsLayout } from '../game/liveOpsLayout.js';
import { eventTracker } from '../analytics/EventTracker.js';
import { storageService } from '../services/StorageService.js';

const ROW_H = 32;
const GREEN = 0x2ecc71;
const GREEN_SHADOW = 0x1e8449;
const PORTAL = 0xFF6B6B;
const PORTAL_SHADOW = 0x8e2a2a;

export class LiveOpsRow extends Container {
  constructor(app, economy, { onBuffs, onPortal, onLayout } = {}) {
    super();
    this.app = app;
    this.economy = economy;
    this.onBuffs = onBuffs || (() => {});
    this.onPortal = onPortal || (() => {});
    this.onLayout = onLayout || (() => {});
    this.visibleHeight = 0;
    this._timer = null;
    this._layoutKey = '';
    this._left = null;
    this._mode = 'hidden';
    this._tick();
    this._timer = setInterval(() => this._tick(), 1000);
  }

  _chip(x, y, w, h, label) {
    const wrap = new Container();
    wrap.position.set(x, y);
    wrap.eventMode = 'static';
    wrap.cursor = 'pointer';
    wrap.hitArea = new Rectangle(0, 0, w, h);

    const shadow = new Graphics();
    shadow.roundRect(0, 3, w, h, 14);
    shadow.fill(GREEN_SHADOW);
    wrap.addChild(shadow);

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 14);
    bg.fill(GREEN);
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

  _paint(chip, fill, shadow) {
    if (!chip) return;
    chip.bg.clear();
    chip.bg.roundRect(0, 0, chip.w, chip.h, 14);
    chip.bg.fill(fill);
    chip.bg.stroke({ color: 0xffffff, alpha: 0.4, width: 1.5 });
    chip.shadow.clear();
    chip.shadow.roundRect(0, 3, chip.w, chip.h, 14);
    chip.shadow.fill(shadow);
  }

  _rebuild(layout) {
    this.removeChildren();
    this._left = null;
    this._mode = layout.mode;
    this.visibleHeight = layout.visible ? ROW_H : 0;
    this.visible = layout.visible;
    if (!layout.visible) return;

    const fullW = CONFIG.GAME_WIDTH - ACTION_ROW_MARGIN * 2;
    this._left = this._chip(0, 0, fullW, ROW_H, layout.left);
    this.addChild(this._left.wrap);
    this._left.wrap.on('pointertap', () => this._onLeft());
  }

  _paintFromLayout(layout) {
    if (layout.mode === 'portal') {
      this._paint(this._left, PORTAL, PORTAL_SHADOW);
      return;
    }
    this._paint(this._left, GREEN, GREEN_SHADOW);
  }

  _tick() {
    const layout = getLiveOpsLayout({
      pendingFlight: empireMeta.snapshot().pendingFlight,
      edictActive: empireMeta.isEdictActive(),
      canClaimDaily: empireMeta.canClaimEdictDaily(),
      edictRemainingMs: empireMeta.edictRemainingMs()
    });
    const key = `${layout.mode}|${layout.left}|${layout.visible}`;
    if (key !== this._layoutKey) {
      this._layoutKey = key;
      this._rebuild(layout);
      this._paintFromLayout(layout);
      this.onLayout();
      return;
    }
    if (this._left && layout.left) this._left.text.text = layout.left;
    this._paintFromLayout(layout);
  }

  _onLeft() {
    if (this._mode === 'portal') {
      this.onPortal();
      return;
    }
    if (this._mode === 'ration') this._claimRation();
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
    try { await storageService.persistCurrency({ gems: this.economy.gems }); } catch (e) {}
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
