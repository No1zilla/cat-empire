import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

// Пользовательский интерфейс (Крупная сочная HUD панель верхней части экрана)
export class HUD extends Container {
  constructor(app) {
    super();
    this.app = app;
    this._coinsText = null;
    this._gemsText = null;
    this._ipsText = null;

    this._draw();
  }

  // Отрисовка элементов HUD
  _draw() {
    const hudWidth = CONFIG.GAME_WIDTH;
    const hudHeight = 92;

    // 1. Фоновая панель HUD
    const bg = new Graphics();
    bg.roundRect(0, 0, hudWidth, hudHeight, 0);
    bg.fill(CONFIG.COLORS.GRID_BG);
    bg.stroke({ color: CONFIG.COLORS.CELL_BORDER, width: 1.5 });
    this.addChild(bg);

    // 2. Иконка и значение монет 🪙
    const coinIconStyle = new TextStyle({ fontSize: 26 });
    const coinIcon = new Text({ text: '🪙', style: coinIconStyle });
    coinIcon.position.set(15, 12);
    this.addChild(coinIcon);

    const coinsStyle = new TextStyle({
      fontSize: 24,
      fontWeight: 'bold',
      fill: CONFIG.COLORS.GOLD,
      dropShadow: { color: '#000000', alpha: 0.5, blur: 3, distance: 1 }
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.position.set(50, 13);
    this.addChild(this._coinsText);

    // 3. Иконка и значение гемов 💎
    const gemIconStyle = new TextStyle({ fontSize: 24 });
    const gemIcon = new Text({ text: '💎', style: gemIconStyle });
    gemIcon.position.set(15, 50);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#a8d8ff'
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.position.set(50, 52);
    this.addChild(this._gemsText);

    // 4. Текст пассивного дохода в секунду (+N/сек)
    const ipsStyle = new TextStyle({
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#2ecc71'
    });
    this._ipsText = new Text({ text: '+0/сек', style: ipsStyle });
    this._ipsText.anchor.set(1, 0.5);
    this._ipsText.position.set(hudWidth - 18, 46);
    this.addChild(this._ipsText);
  }

  // Метод обновления значений на панели HUD
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

  render() {}
}

export default HUD;
