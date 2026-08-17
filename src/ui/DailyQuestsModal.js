import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { dailyQuestsService } from '../game/DailyQuests.js';
import { eventBus } from '../utils/EventBus.js';
import { eventTracker } from '../analytics/EventTracker.js';

/**
 * Окно ежедневных заданий.
 */
export class DailyQuestsModal extends Container {
  constructor(app, economy, onClose) {
    super();
    this.app = app;
    this.economy = economy;
    this.onClose = onClose || (() => {});
    this.eventMode = 'static';
    this.zIndex = 999999;
    this._draw();
  }

  _draw() {
    this.removeChildren();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const state = dailyQuestsService.getState();
    const font = TOKENS.typography.fontFamily;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(overlay);

    const modalW = 350;
    const modalH = 430;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xA55EEA, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: '📋 ЗАДАНИЯ ДНЯ',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#ffffff',
        dropShadow: { color: '#000000', alpha: 0.6, blur: 3 }
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 34);
    this.addChild(title);

    const hint = new Text({
      text: 'Обновляются каждый день в полночь',
      style: new TextStyle({ fontFamily: font, fontSize: 12, fill: TOKENS.colors.textSecondary })
    });
    hint.anchor.set(0.5);
    hint.position.set(W / 2, modalY + 58);
    this.addChild(hint);

    state.quests.forEach((quest, index) => {
      const y = modalY + 82 + index * 92;
      const done = quest.progress >= quest.target;
      const card = new Graphics();
      card.roundRect(modalX + 18, y, modalW - 36, 82, 14);
      card.fill(0x1a1638);
      card.stroke({ color: quest.claimed ? 0x2ecc71 : (done ? 0xFFD15C : 0x271F4F), width: 1.8 });
      this.addChild(card);

      const qTitle = new Text({
        text: quest.title,
        style: new TextStyle({ fontFamily: font, fontSize: 14, fontWeight: 'bold', fill: '#ffffff' })
      });
      qTitle.position.set(modalX + 32, y + 12);
      this.addChild(qTitle);

      const progress = new Text({
        text: `${Math.min(quest.progress, quest.target)} / ${quest.target}   •   +${UIUtils.formatRubies(quest.rewardGems)}`,
        style: new TextStyle({ fontFamily: font, fontSize: 12, fill: TOKENS.colors.textSecondary })
      });
      progress.position.set(modalX + 32, y + 34);
      this.addChild(progress);

      const barW = modalW - 170;
      const bar = new Graphics();
      bar.roundRect(modalX + 32, y + 56, barW, 10, 5);
      bar.fill(0x0c0821);
      this.addChild(bar);
      const fillW = Math.max(4, Math.round(barW * Math.min(1, quest.progress / quest.target)));
      const fill = new Graphics();
      fill.roundRect(modalX + 32, y + 56, fillW, 10, 5);
      fill.fill(done ? 0x2ecc71 : 0xA55EEA);
      this.addChild(fill);

      if (quest.claimed) {
        const claimed = new Text({
          text: '✓',
          style: new TextStyle({ fontFamily: font, fontSize: 22, fill: '#2ecc71', fontWeight: 'bold' })
        });
        claimed.anchor.set(0.5);
        claimed.position.set(modalX + modalW - 48, y + 41);
        this.addChild(claimed);
      } else if (done) {
        const claimBtn = UIUtils.createButton(
          modalX + modalW - 118,
          y + 22,
          86,
          36,
          'ЗАБРАТЬ',
          0xFF6B6B,
          () => this._claim(quest.id)
        );
        this.addChild(claimBtn);
      }
    });

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

  _claim(questId) {
    const quest = dailyQuestsService.claim(questId);
    if (!quest) return;
    if (this.economy) this.economy.addGems(quest.rewardGems);
    eventBus.emit('REWARD_CLAIMED', quest);
    eventTracker.track('quest_claimed', { quest_id: quest.id, gems: quest.rewardGems });
    UIUtils.showToast(this.app.stage, `+${UIUtils.formatRubies(quest.rewardGems)} за задание!`);
    this._draw();
  }

  _close() {
    if (typeof this.onClose === 'function') this.onClose();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default DailyQuestsModal;
