import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { fetchLeaderboard } from '../api/client.js';

/**
 * Таблица лидеров по максимальному уровню котика.
 */
export class LeaderboardModal extends Container {
  constructor(app, playerStats = {}, onClose) {
    super();
    this.app = app;
    this.playerStats = playerStats;
    this.onClose = onClose || (() => {});
    this.eventMode = 'static';
    this.zIndex = 999999;
    this._drawLoading();
    this._load();
  }

  _drawLoading() {
    this._drawFrame('Загружаем топ игроков...');
  }

  _drawFrame(statusText, rows = []) {
    this.removeChildren();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const font = TOKENS.typography.fontFamily;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(overlay);

    const modalW = 350;
    const modalH = 500;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFFD15C, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: '🏆 КОТО-ИМПЕРИЯ',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#ffffff',
        dropShadow: { color: '#000000', alpha: 0.6, blur: 3 }
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 32);
    this.addChild(title);

    if (statusText) {
      const status = new Text({
        text: statusText,
        style: new TextStyle({ fontFamily: font, fontSize: 13, fill: TOKENS.colors.textSecondary, align: 'center' })
      });
      status.anchor.set(0.5);
      status.position.set(W / 2, modalY + 70);
      this.addChild(status);
    }

    rows.forEach((row, index) => {
      const y = modalY + 86 + index * 34;
      const line = new Graphics();
      line.roundRect(modalX + 16, y, modalW - 32, 30, 8);
      line.fill(row.isYou ? 0x2d2158 : 0x1a1638);
      this.addChild(line);

      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const rank = new Text({
        text: medal,
        style: new TextStyle({ fontFamily: font, fontSize: 13, fill: '#ffffff', fontWeight: 'bold' })
      });
      rank.position.set(modalX + 26, y + 6);
      this.addChild(rank);

      const name = new Text({
        text: String(row.name || 'Игрок').slice(0, 16),
        style: new TextStyle({ fontFamily: font, fontSize: 13, fill: row.isYou ? '#FFD15C' : '#ffffff' })
      });
      name.position.set(modalX + 62, y + 7);
      this.addChild(name);

      const lvl = new Text({
        text: `ур.${row.maxCatLevel || 1}`,
        style: new TextStyle({ fontFamily: font, fontSize: 12, fill: TOKENS.colors.income })
      });
      lvl.anchor.set(1, 0);
      lvl.position.set(modalX + modalW - 28, y + 8);
      this.addChild(lvl);
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

  async _load() {
    const data = await fetchLeaderboard();
    const remote = (data && Array.isArray(data.leaderboard)) ? data.leaderboard : [];
    const youName = 'Ты';
    const you = {
      name: youName,
      maxCatLevel: this.playerStats.maxCatLevel || 1,
      coins: this.playerStats.coins || 0,
      isYou: true
    };

    let rows = remote.slice(0, 10).map((entry) => ({
      name: [entry.firstName, entry.lastName].filter(Boolean).join(' ') || 'Игрок',
      maxCatLevel: entry.maxCatLevel || 1,
      coins: entry.coins || 0,
      isYou: false
    }));

    if (rows.length === 0) {
      rows = [you];
      this._drawFrame('Пока ты один на вершине!', rows);
      return;
    }

    this._drawFrame('', rows);
  }

  _close() {
    if (typeof this.onClose === 'function') this.onClose();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default LeaderboardModal;
