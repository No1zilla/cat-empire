import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

// Пользовательский интерфейс (HUD панель верхней части экрана)
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
    const hudHeight = 90;

    // 1. Фонавая панель HUD
    const bg = new Graphics();
    bg.roundRect(0, 0, hudWidth, hudHeight, 0);
    bg.fill(CONFIG.COLORS.GRID_BG);
    this.addChild(bg);

    // 2. Иконка и значение монет 🪙
    const coinIconStyle = new TextStyle({ fontSize: 22 });
    const coinIcon = new Text({ text: '🪙', style: coinIconStyle });
    coinIcon.position.set(15, 15);
    this.addChild(coinIcon);

    const coinsStyle = new TextStyle({
      fontSize: 20,
      fontWeight: 'bold',
      fill: CONFIG.COLORS.GOLD
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.position.set(45, 16);
    this.addChild(this._coinsText);

    // 3. Иконка и значение гемов 💎
    const gemIconStyle = new TextStyle({ fontSize: 22 });
    const gemIcon = new Text({ text: '💎', style: gemIconStyle });
    gemIcon.position.set(15, 48);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#a8d8ff'
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.position.set(45, 49);
    this.addChild(this._gemsText);

    // 4. Текст пассивного дохода в секунду (+N/сек)
    const ipsStyle = new TextStyle({
      fontSize: 13,
      fill: CONFIG.COLORS.TEXT_DIM
    });
    this._ipsText = new Text({ text: '+0/сек', style: ipsStyle });
    this._ipsText.position.set(hudWidth - 110, 36);
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

  // Заглушка для рендеринга
  render() {}
}

export default HUD;
