import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export const UIUtils = {
  /**
   * Рисует премиальную 3D монету со звездой внутри
   * @param {number} radius - размер монеты
   * @returns {Container}
   */
  createCoinIcon: (radius = 12) => {
    const container = new Container();

    // Тень (чтобы монета читалась на любом фоне)
    const shadow = new Graphics();
    shadow.circle(0, 3, radius);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    container.addChild(shadow);

    // Внешний ободок (тёмное золото)
    const rim = new Graphics();
    rim.circle(0, 0, radius);
    rim.fill(0xb87c00);
    container.addChild(rim);

    // Внутренняя часть (светлое золото/жёлтый)
    const inner = new Graphics();
    inner.circle(0, 0, radius * 0.85);
    inner.fill(0xffd700);
    container.addChild(inner);

    // Внутреннее кольцо (блик на границе)
    const innerRing = new Graphics();
    innerRing.circle(0, 0, radius * 0.75);
    innerRing.stroke({ color: 0xffea75, width: radius * 0.1 });
    container.addChild(innerRing);

    // Звезда в центре
    const star = new Graphics();
    // Функция рисования звезды в Pixi: drawStar(x, y, points, radius, innerRadius, rotation)
    // Если drawStar нет в текущей версии, нарисуем руками 5-конечную звезду:
    const spikes = 5;
    const outerRadius = radius * 0.4;
    const innerRadius = radius * 0.2;
    star.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      let angle = (i * 2 * Math.PI) / spikes - Math.PI / 2;
      let nextAngle = ((i + 1) * 2 * Math.PI) / spikes - Math.PI / 2;
      let midAngle = angle + Math.PI / spikes;
      star.lineTo(Math.cos(midAngle) * innerRadius, Math.sin(midAngle) * innerRadius);
      star.lineTo(Math.cos(nextAngle) * outerRadius, Math.sin(nextAngle) * outerRadius);
    }
    star.fill(0xffa500); // Оранжевая звезда
    // Тень от звезды
    star.stroke({ color: 0xb87c00, width: 1 });
    container.addChild(star);

    // Главный блик (полумесяц сверху слева)
    const shine = new Graphics();
    shine.arc(0, 0, radius * 0.65, Math.PI, Math.PI * 1.5);
    shine.stroke({ color: 0xffffff, width: radius * 0.2, alpha: 0.8, cap: 'round' });
    container.addChild(shine);

    return container;
  }
};
