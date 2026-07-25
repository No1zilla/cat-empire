import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

/**
 * TASK-018B: Бесшовный шапка HUD уровня AAA (1 в 1 с промо-скриншотом №1)
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

    const hudWidth = CONFIG.GAME_WIDTH || 410;
    const hudHeight = 58;

    // 1. Единый монолитный тёмно-фиолетовый фон шапки (без уродливых цветных рамок)
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill(0x0a0718);
    bg.stroke({ color: 0x251c48, width: 1.0 });
    this.addChild(bg);

    // 2. Блок Монет 🪙 (Единая мягкая подложка без желтой окантовки)
    const coinBg = new Graphics();
    coinBg.roundRect(8, 10, 138, 38, 19);
    coinBg.fill({ color: 0x191436, alpha: 0.85 });
    this.addChild(coinBg);

    // Золотая 3D иконка монеты
    const goldCoinIcon = new Graphics();
    goldCoinIcon.circle(27, 29, 11);
    goldCoinIcon.fill(0xffd700);
    goldCoinIcon.stroke({ color: 0xffaa00, width: 2 });
    this.addChild(goldCoinIcon);

    const coinSparkle = new Graphics();
    coinSparkle.circle(24, 25, 3);
    coinSparkle.fill(0xffffff);
    this.addChild(coinSparkle);

    const coinsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.position.set(44, 20);
    this.addChild(this._coinsText);

    // 3. Блок Гемов 💎
    const gemBg = new Graphics();
    gemBg.roundRect(152, 10, 92, 38, 19);
    gemBg.fill({ color: 0x191436, alpha: 0.85 });
    this.addChild(gemBg);

    const gemIconStyle = new TextStyle({ fontSize: 16 });
    const gemIcon = new Text({ text: '💎', style: gemIconStyle });
    gemIcon.position.set(160, 19);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2, distance: 1 }
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.position.set(186, 20);
    this.addChild(this._gemsText);

    // 4. Блок Дохода ⬆️
    const ipsBg = new Graphics();
    ipsBg.roundRect(250, 10, 152, 38, 19);
    ipsBg.fill({ color: 0x0f2b1b, alpha: 0.85 });
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
    this._ipsText.position.set(326, 29);
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
      this._ipsText.text = `+${Math.floor(incomePerSecond || 0)}/сек ⬆️`;
    }
  }
}

export default HUD;
