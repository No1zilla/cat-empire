import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getUITexture } from '../utils/catTextures.js';

/**
 * TASK-018B: Премиальная шапка HUD уровня AAA (1 в 1 с промо-скриншотом №1)
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
    const hudHeight = 64;

    // 1. Градиентная тёмно-фиолетовая подложка с окантовкой
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill(0x0e0a1f);
    bg.stroke({ color: 0x2d2454, width: 1.5 });
    this.addChild(bg);

    // 2. Блок Монет 🪙 (Золотой баббл)
    const coinBg = new Graphics();
    coinBg.roundRect(10, 12, 130, 40, 20);
    coinBg.fill(0x1a1438);
    coinBg.stroke({ color: 0xffd700, width: 1.5 });
    this.addChild(coinBg);

    const coinIconStyle = new TextStyle({ fontSize: 20 });
    const coinIcon = new Text({ text: '🪙', style: coinIconStyle });
    coinIcon.position.set(16, 20);
    this.addChild(coinIcon);

    const coinsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffd700',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.position.set(44, 22);
    this.addChild(this._coinsText);

    // 3. Блок Гемов 💎 (Сияющий баббл)
    const gemBg = new Graphics();
    gemBg.roundRect(148, 12, 90, 40, 20);
    gemBg.fill(0x1a1438);
    gemBg.stroke({ color: 0x70a1ff, width: 1.5 });
    this.addChild(gemBg);

    const gemIconStyle = new TextStyle({ fontSize: 18 });
    const gemIcon = new Text({ text: '💎', style: gemIconStyle });
    gemIcon.position.set(154, 21);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#a8d8ff',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.position.set(182, 22);
    this.addChild(this._gemsText);

    // 4. Блок Прироста Дохода ⬆️ (Неоновый зеленый баббл)
    const ipsBg = new Graphics();
    ipsBg.roundRect(246, 12, 160, 40, 20);
    ipsBg.fill(0x102619);
    ipsBg.stroke({ color: 0x2ecc71, width: 1.5 });
    this.addChild(ipsBg);

    const ipsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#2ecc71',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
    });
    this._ipsText = new Text({ text: '+0/сек ⬆️', style: ipsStyle });
    this._ipsText.anchor.set(0.5, 0.5);
    this._ipsText.position.set(326, 32);
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
      this._ipsText.text = `+${Math.floor(incomePerSecond || 0)}/сек ⬆️`;
    }
  }
}

export default HUD;
