import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { DAILY_REWARD_TABLE, dailyRewardsService } from '../game/DailyRewards.js';
import { showRewardedAd } from '../api/client.js';
import { isAdUserClosed } from '../api/vkAds.js';
import { eventBus } from '../utils/EventBus.js';
import { eventTracker } from '../analytics/EventTracker.js';

/**
 * Окно 7-дневного календаря подарков.
 */
export class DailyRewardsModal extends Container {
  constructor(app, economy, onClaimed, onClose) {
    super();
    this.app = app;
    this.economy = economy;
    this.onClaimed = onClaimed || (() => {});
    this.onClose = onClose || (() => {});
    this._claimedReward = null;
    this.eventMode = 'static';
    this.zIndex = 999999;
    this._draw();
  }

  _draw() {
    this.removeChildren();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const state = dailyRewardsService.getState();
    const font = TOKENS.typography.fontFamily;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(overlay);

    const modalW = 360;
    const modalH = 470;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFFD15C, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: '🎁 ЕЖЕДНЕВНЫЙ ПОДАРОК',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 18,
        fontWeight: 'bold',
        fill: '#ffffff',
        dropShadow: { color: '#000000', alpha: 0.6, blur: 3 }
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 32);
    this.addChild(title);

    const streak = state.streak || 0;
    const sub = new Text({
      text: streak > 0 ? `Серия: ${streak} дн. подряд` : 'Заходи каждый день — награда растёт',
      style: new TextStyle({ fontFamily: font, fontSize: 12, fill: TOKENS.colors.textSecondary })
    });
    sub.anchor.set(0.5);
    sub.position.set(W / 2, modalY + 56);
    this.addChild(sub);

    const cardW = 72;
    const cardH = 86;
    const gap = 10;
    const cols = 4;
    const gridW = cols * cardW + (cols - 1) * gap;
    const startX = modalX + (modalW - gridW) / 2;
    const startY = modalY + 80;

    DAILY_REWARD_TABLE.forEach((reward, index) => {
      const day = index + 1;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const isCurrent = day === state.currentDay;
      const isPast = state.claimedToday ? day <= state.currentDay : day < state.currentDay;

      const card = new Graphics();
      card.roundRect(x, y, cardW, cardH, 12);
      card.fill(isCurrent ? 0x2d2158 : 0x1a1638);
      card.stroke({
        color: isCurrent ? 0xFFD15C : (isPast ? 0x2ecc71 : 0x271F4F),
        width: isCurrent ? 2 : 1.5
      });
      this.addChild(card);

      const dayLabel = new Text({
        text: `День ${day}`,
        style: new TextStyle({ fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: '#ffffff' })
      });
      dayLabel.anchor.set(0.5);
      dayLabel.position.set(x + cardW / 2, y + 16);
      this.addChild(dayLabel);

      const prize = new Text({
        text: reward.label,
        style: new TextStyle({
          fontFamily: font,
          fontSize: 11,
          fill: isCurrent ? '#FFD15C' : '#cfc8e8',
          align: 'center',
          wordWrap: true,
          wordWrapWidth: cardW - 8
        })
      });
      prize.anchor.set(0.5);
      prize.position.set(x + cardW / 2, y + 48);
      this.addChild(prize);

      if (isPast) {
        const check = new Text({
          text: '✓',
          style: new TextStyle({ fontFamily: font, fontSize: 14, fill: '#2ecc71', fontWeight: 'bold' })
        });
        check.anchor.set(0.5);
        check.position.set(x + cardW / 2, y + 72);
        this.addChild(check);
      }
    });

    const statusY = modalY + 280;
    if (state.claimedToday) {
      const done = new Text({
        text: 'Подарок за сегодня уже получен!\nВозвращайся завтра 🐱',
        style: new TextStyle({
          fontFamily: font,
          fontSize: 13,
          fill: '#2ecc71',
          align: 'center'
        })
      });
      done.anchor.set(0.5);
      done.position.set(W / 2, statusY + 24);
      this.addChild(done);
    } else {
      const claimBtn = UIUtils.createButton(
        modalX + 30,
        statusY,
        modalW - 60,
        46,
        `ЗАБРАТЬ • ${state.reward.label}`,
        0xFF6B6B,
        () => this._claim(false)
      );
      this.addChild(claimBtn);

      const adBtn = UIUtils.createButton(
        modalX + 30,
        statusY + 56,
        modalW - 60,
        40,
        '🎬 Забрать x2 за рекламу',
        0xA55EEA,
        () => this._claim(true)
      );
      this.addChild(adBtn);
    }

    const closeBtn = UIUtils.createButton(
      modalX + (modalW - 140) / 2,
      modalY + modalH - 48,
      140,
      34,
      'ЗАКРЫТЬ',
      0x3d356c,
      () => this._close()
    );
    this.addChild(closeBtn);
  }

  async _claim(doubleWithAd) {
    const before = dailyRewardsService.getState();
    if (!before.canClaim) return;

    let multiplier = 1;
    if (doubleWithAd) {
      eventTracker.trackAdRequested('daily_reward_double');
      const ad = await showRewardedAd();
      if (!ad || !ad.success) {
        const reason = ad && ad.reason ? ad.reason : 'ads_unavailable';
        if (ad && isAdUserClosed(ad.reason)) {
          eventTracker.trackAdSkipped('daily_reward_double', { error_reason: reason, format: ad.format || '' });
        } else {
          eventTracker.trackAdFailed('daily_reward_double', reason, { format: ad && ad.format ? ad.format : '' });
        }
        UIUtils.showToast(this.app.stage, 'Реклама недоступна — обычный подарок');
      } else {
        multiplier = 2;
        eventTracker.trackAdShown('daily_reward_double', false);
        eventTracker.trackAdCompleted('daily_reward_double', before.reward.gems * 2);
      }
    }

    const reward = dailyRewardsService.claim();
    if (!reward) return;

    const coins = (reward.coins || 0) * multiplier;
    const gems = (reward.gems || 0) * multiplier;
    if (this.economy) {
      this.economy.coins += coins;
      this.economy.addGems(gems);
    }

    eventBus.emit('REWARD_CLAIMED', reward);
    eventTracker.track('daily_reward_claimed', {
      day: reward.day,
      coins,
      gems,
      cat_level: reward.catLevel || 0,
      multiplier
    });

    this._claimedReward = { ...reward, coins, gems, multiplier };
    if (typeof this.onClaimed === 'function') {
      this.onClaimed(this._claimedReward);
    }
    this._draw();
  }

  _close() {
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default DailyRewardsModal;
