import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';

/**
 * HUD в стиле промо-арта
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

  // Отрисовка элементов HUD
  _draw() {
    this.removeChildren();

    const hudWidth = CONFIG.GAME_WIDTH;
    const hudHeight = 90;

    // 1. Тёмная прозрачная панель HUD с тонкой рамкой снизу
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill({ color: 0x161033, alpha: 0.95 });
    
    // Тонкая линия-рамка снизу
    bg.moveTo(0, hudHeight);
    bg.lineTo(hudWidth, hudHeight);
    bg.stroke({ color: 0x3d356c, width: 2, alpha: 0.8 });
    this.addChild(bg);

    // 2. Иконка и значение монет
    const coinIcon = UIUtils.createCoinIcon(18);
    coinIcon.position.set(28, 30);
    this.addChild(coinIcon);

    const coinsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 30,
      fontWeight: '900',
      fill: '#ffde00',
      stroke: { color: '#a66a00', width: 5, join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.3, blur: 0, distance: 3 }
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.position.set(56, 12);
    this.addChild(this._coinsText);

    // 3. Иконка и значение гемов 💎 (Под монетами)
    const gemIconStyle = new TextStyle({ fontSize: 20 });
    const gemIcon = new Text({ text: '💎', style: gemIconStyle });
    gemIcon.anchor.set(0.5, 0.5);
    gemIcon.position.set(28, 64);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 20,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: { color: '#2b4c7e', width: 4, join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.3, blur: 0, distance: 2 }
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.position.set(56, 52);
    this.addChild(this._gemsText);

    // 4. Доход в секунду (Справа по центру высоты монет)
    const ipsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18,
      fontWeight: '900',
      fill: '#45f57c',
      stroke: { color: '#0d6b2c', width: 4, join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.3, blur: 0, distance: 2 }
    });
    this._ipsText = new Text({ text: '+0/сек', style: ipsStyle });
    this._ipsText.anchor.set(1, 0.5); // Выравнивание по правому краю
    this._ipsText.position.set(hudWidth - 20, 32);
    this.addChild(this._ipsText);
  }

  // Обновление значений на панели HUD
  update(coins, gems, incomePerSecond) {
    if (this._coinsText) {
      this._coinsText.text = Math.floor(coins || 0).toLocaleString('ru-RU');
    }
    if (this._gemsText) {
      this._gemsText.text = String(gems || 0);
    }
    if (this._ipsText) {
      this._ipsText.text = `+${Math.floor(incomePerSecond || 0)}/сек`;
    }
  }
}

export default HUD;
