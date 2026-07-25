import { Container, Graphics } from 'pixi.js';

export const UIUtils = {
  /**
   * Возвращает стандартизированную 3D золотую монету (без серых системных эмодзи)
   * @param {number} radius - радиус монеты
   * @returns {Container}
   */
  createCoinIcon: (radius = 10) => {
    const container = new Container();

    // 1. Основной золотой круг
    const goldCircle = new Graphics();
    goldCircle.circle(0, 0, radius);
    goldCircle.fill(0xffd700);
    goldCircle.stroke({ color: 0xff8c00, width: Math.max(1.5, radius * 0.18) });
    container.addChild(goldCircle);

    // 2. Внутренний блик
    const sparkle = new Graphics();
    sparkle.circle(-radius * 0.3, -radius * 0.3, radius * 0.28);
    sparkle.fill({ color: 0xffffff, alpha: 0.85 });
    container.addChild(sparkle);

    return container;
  }
};
