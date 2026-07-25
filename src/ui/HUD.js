import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

/**
 * TASK-018B: Идеальная 3-капсульная шапка HUD (как на промо-скриншоте №1)
 * Единая строка из 3-х стильных округлых бабблов (Монеты, Гемы, Доход)
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
    const hudHeight = 60;

    // 1. Тёмно-фиолетовый фон верхней панели
    const bg = new Graphics();
    bg.rect(0, 0, hudWidth, hudHeight);
    bg.fill(0x0c081e);
    bg.stroke({ color: 0x221a42, width: 1.0 });
    this.addChild(bg);

    // --- БАББЛ 1: МОНЕТЫ 🪙 (Ширина 145px) ---
    const coinBg = new Graphics();
    coinBg.roundRect(10, 10, 145, 40, 20);
    coinBg.fill(0x191333);
    coinBg.stroke({ color: 0xffd700, width: 1.5, alpha: 0.8 });
    this.addChild(coinBg);

    // Золотая 3D иконка монеты
    const goldCoin = new Graphics();
    goldCoin.circle(28, 30, 11);
    goldCoin.fill(0xffd700);
    goldCoin.stroke({ color: 0xffa500, width: 2.0 });
    this.addChild(goldCoin);

    const coinSparkle = new Graphics();
    coinSparkle.circle(25, 26, 3);
    coinSparkle.fill(0xffffff);
    this.addChild(coinSparkle);

    const coinsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffd700',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._coinsText = new Text({ text: '0', style: coinsStyle });
    this._coinsText.position.set(45, 21);
    this.addChild(this._coinsText);

    // --- БАББЛ 2: ГЕМЫ 💎 (Ширина 85px) ---
    const gemBg = new Graphics();
    gemBg.roundRect(162, 10, 85, 40, 20);
    gemBg.fill(0x191333);
    gemBg.stroke({ color: 0x4a90e2, width: 1.5, alpha: 0.8 });
    this.addChild(gemBg);

    const gemIconStyle = new TextStyle({ fontSize: 17 });
    const gemIcon = new Text({ text: '💎', style: gemIconStyle });
    gemIcon.position.set(170, 19);
    this.addChild(gemIcon);

    const gemsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._gemsText = new Text({ text: '0', style: gemsStyle });
    this._gemsText.position.set(198, 21);
    this.addChild(this._gemsText);

    // --- БАББЛ 3: ДОХОД ⬆️ (Ширина 148px) ---
    const ipsBg = new Graphics();
    ipsBg.roundRect(253, 10, 148, 40, 20);
    ipsBg.fill(0x0f291a);
    ipsBg.stroke({ color: 0x2ecc71, width: 1.5, alpha: 0.8 });
    this.addChild(ipsBg);

    const ipsStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#2ecc71',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    this._ipsText = new Text({ text: '+0/сек ⬆️', style: ipsStyle });
    this._ipsText.anchor.set(0.5, 0.5);
    this._ipsText.position.set(327, 30);
    this.addChild(this._ipsText);
  }

  // Обновление значений на панели HUD
  update(coins, gems, incomePerSecond) {
    if (this._coinsText) {
      const formattedCoins = Math.floor(coins || 0).toLocaleString('ru-RU');
      this._coinsText.text = formattedCoins;
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
