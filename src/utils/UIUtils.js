import { Container, Text, TextStyle } from 'pixi.js';

export const UIUtils = {
  /**
   * Возвращает стандартизированную иконку монеты (эмодзи 🪙)
   * @param {number} radius - размер монеты
   * @returns {Container}
   */
  createCoinIcon: (radius = 12) => {
    const container = new Container();
    const style = new TextStyle({
      fontSize: radius * 2,
      dropShadow: { color: '#000000', alpha: 0.3, blur: 2, distance: 1 }
    });
    const coinText = new Text({ text: '🪙', style });
    // Центрируем иконку для совместимости со старым кодом
    coinText.anchor.set(0.5, 0.5);
    container.addChild(coinText);
    return container;
  }
};
