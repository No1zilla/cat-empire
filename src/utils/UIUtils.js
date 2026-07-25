import { Container, Graphics } from 'pixi.js';

export const UIUtils = {
  /**
   * Рисует стандартизированную 3D монету
   * @param {number} radius - радиус монеты
   * @param {boolean} isSilver - если true, монета будет серебряной (как на промо)
   * @returns {Container} Контейнер с отрисованной монетой
   */
  createCoinIcon: (radius = 12, isSilver = true) => {
    const container = new Container();

    // 1. Тень монеты
    const shadow = new Graphics();
    shadow.circle(0, 2, radius);
    shadow.fill(isSilver ? 0x555555 : 0xaa7700);
    container.addChild(shadow);

    // 2. Основа монеты (градиент/объем)
    const base = new Graphics();
    base.circle(0, 0, radius);
    base.fill(isSilver ? 0xd0d4dc : 0xffd700);
    base.stroke({ color: isSilver ? 0xffffff : 0xffaa00, width: radius * 0.15, alpha: 0.8 });
    container.addChild(base);

    // 3. Внутренняя гравировка (имитация орла/рисунка)
    const engraving = new Graphics();
    engraving.circle(0, 0, radius * 0.6);
    engraving.stroke({ color: isSilver ? 0xa0a5b0 : 0xd4af37, width: 1 });
    
    // Парочка линий внутри для имитации сложной гравировки (орла)
    engraving.moveTo(-radius * 0.3, -radius * 0.2);
    engraving.lineTo(radius * 0.3, radius * 0.2);
    engraving.moveTo(radius * 0.3, -radius * 0.2);
    engraving.lineTo(-radius * 0.3, radius * 0.2);
    container.addChild(engraving);

    // 4. Блик света
    const shine = new Graphics();
    shine.ellipse(-radius * 0.3, -radius * 0.3, radius * 0.3, radius * 0.15);
    shine.fill({ color: 0xffffff, alpha: 0.6 });
    // Поворачиваем блик
    shine.rotation = -0.5;
    container.addChild(shine);

    return container;
  }
};
