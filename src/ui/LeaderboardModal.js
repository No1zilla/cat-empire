import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { TOKENS } from '../styles/design-tokens.js';
import { fetchLeaderboard } from '../api/client.js';
import { formatLeaderName, buildLeaderboardRows } from './leaderboardRows.js';

export { formatLeaderName, buildLeaderboardRows };

function currentVkId() {
  try {
    return String(localStorage.getItem('cat_empire_vk_user_id') || '');
  } catch {
    return '';
  }
}

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
    this._load().catch(() => {
      this._drawFrame('Топ не загрузился. Открой ещё раз.', []);
    });
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
    const modalH = 520;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);
    bg.stroke({ color: 0xFFD15C, width: 2.5 });
    this.addChild(bg);

    const title = new Text({
      text: 'ТОП ДВОРА',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#ffffff',
        dropShadow: { color: '#000000', alpha: 0.6, blur: 3 }
      })
    });
    title.anchor.set(0.5);
    title.position.set(W / 2, modalY + 28);
    this.addChild(title);

    const hint = new Text({
      text: 'по уровню котика',
      style: new TextStyle({ fontFamily: font, fontSize: 11, fill: TOKENS.colors.textMuted || '#9ca3af' })
    });
    hint.anchor.set(0.5);
    hint.position.set(W / 2, modalY + 48);
    this.addChild(hint);

    if (statusText) {
      const status = new Text({
        text: statusText,
        style: new TextStyle({ fontFamily: font, fontSize: 13, fill: TOKENS.colors.textSecondary, align: 'center' })
      });
      status.anchor.set(0.5);
      status.position.set(W / 2, modalY + 64);
      this.addChild(status);
    }

    rows.forEach((row, index) => {
      const y = modalY + 88 + index * 34;
      const line = new Graphics();
      line.roundRect(modalX + 16, y, modalW - 32, 30, 8);
      line.fill(row.isYou ? 0x2d2158 : 0x1a1638);
      this.addChild(line);

      const place = row.rank || (index + 1);
      const rank = new Text({
        text: String(place),
        style: new TextStyle({
          fontFamily: font,
          fontSize: 13,
          fill: place <= 3 ? '#FFD15C' : '#ffffff',
          fontWeight: 'bold'
        })
      });
      rank.position.set(modalX + 26, y + 6);
      this.addChild(rank);

      const label = row.isYou && row.name !== 'Ты'
        ? `${String(row.name || 'Игрок').slice(0, 12)} · ты`
        : String(row.name || 'Игрок').slice(0, 16);
      const name = new Text({
        text: label,
        style: new TextStyle({ fontFamily: font, fontSize: 13, fill: row.isYou ? '#FFD15C' : '#ffffff' })
      });
      name.position.set(modalX + 52, y + 7);
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
    let data = await fetchLeaderboard();
    if (!data || !Array.isArray(data.leaderboard)) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      data = await fetchLeaderboard();
    }
    const youVk = String(this.playerStats.vkId || currentVkId() || '');
    const built = buildLeaderboardRows(data, this.playerStats, youVk);
    const status = built.status === 'error'
      ? 'Топ не загрузился. Открой ещё раз.'
      : built.status === 'empty'
        ? 'Пока ты один на вершине.'
        : '';
    this._drawFrame(status, built.rows);
  }

  _close() {
    if (typeof this.onClose === 'function') this.onClose();
    if (this.parent) this.parent.removeChild(this);
    this.destroy({ children: true });
  }
}

export default LeaderboardModal;
