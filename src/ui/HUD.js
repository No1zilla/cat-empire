import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';

/**
 * Премиальный HUD AAA-уровня
 */
export class HUD extends Container {
  constructor(app, onOpenCollection) {
    super();
    this.app = app;
    this.onOpenCollection = onOpenCollection || (() => {});
    this._coinsText = null;
    this._gemsText = null;
    this._ipsText = null;

    this._draw();
  }

  _draw() {
    this.removeChildren();
    const hudWidth = CONFIG.GAME_WIDTH || 410;
    const hudHeight = 85;

    // 1. Премиальный фон: тёмный, минималистичный, с едва заметной границей снизу
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill({ color: 0x0f0b1e, alpha: 0.95 });
    
    // Элегантная неоновая полоска снизу
    bg.moveTo(0, hudHeight);
    bg.lineTo(hudWidth, hudHeight);
    bg.stroke({ color: 0x4a3a82, width: 2, alpha: 0.8 });
    this.addChild(bg);

    // 2. Блок МОНЕТ (Слева, крупно)
    const coinIcon = UIUtils.createCoinIcon(16);
    coinIcon.position.set(34, 30);
    this.addChild(coinIcon);

    const coinsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 32,
      fontWeight: '900',
      fill: '#ffd700', // Чистое золото
      stroke: { color: '#663a00', width: 6, join: 'round' }, // Мощная коричневая обводка
      dropShadow: { color: '#000000', alpha: 0.4, blur: 0, distance: 3 } // Жесткая тень
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.position.set(60, 10);
    this.addChild(this._coinsText);

    // 3. Блок ГЕМОВ (Слева, под монетами, чуть мельче)
    const gemStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18,
      fontWeight: '900',
      fill: '#4a90e2',
      stroke: { color: '#092147', width: 4, join: 'round' }
    });
    const gemIcon = new Text({ text: '💎', style: gemStyle });
    gemIcon.anchor.set(0.5, 0.5);
    gemIcon.position.set(34, 62);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 20,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: { color: '#163a6e', width: 4, join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.4, blur: 0, distance: 2 }
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.position.set(60, 50);
    this.addChild(this._gemsText);

    // 4. Блок ДОХОДА (Справа, выровнен по центру)
    const ipsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18,
      fontWeight: '900',
      fill: '#2ecc71',
      stroke: { color: '#08451a', width: 4, join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.4, blur: 0, distance: 2 }
    });
    this._ipsText = new Text({ text: '+0/сек ⬆️', style: ipsStyle });
    this._ipsText.anchor.set(1, 0.5); // Right aligned, vertically centered
    this._ipsText.position.set(hudWidth - 16, 42); // По центру высоты HUD
    this.addChild(this._ipsText);
  }

  update(coins, gems, incomePerSecond) {
    if (this._coinsText) {
      this._coinsText.text = Math.floor(coins || 0).toLocaleString('ru-RU');
    }
    if (this._gemsText) {
      this._gemsText.text = String(gems || 0);
    }
    if (this._ipsText) {
      this._ipsText.text = `+${Math.floor(incomePerSecond || 0)}/сек ⬆️`;
    }
  }
}
