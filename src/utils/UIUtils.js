import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';

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
  },

  /**
   * Рисует объёмный 3D огранённый кристалл гема (Розово-рубиновый бриллиант)
   * @param {number} size - размер
   * @returns {Container}
   */
  createGemIcon: (size = 11) => {
    const container = new Container();

    // Тень от кристалла
    const shadow = new Graphics();
    shadow.ellipse(0, size + 2, size * 0.8, size * 0.3);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    container.addChild(shadow);

    const g = new Graphics();

    // 1. Нижняя пик-грань (основное конусное основание)
    g.poly([-size, -size * 0.3, 0, size, size, -size * 0.3]);
    g.fill(0xd81b60); // Насыщенный рубин

    // 2. Верхняя корона трапеция
    g.poly([-size, -size * 0.3, -size * 0.6, -size, size * 0.6, -size, size, -size * 0.3]);
    g.fill(0xff4081); // Розовый неон

    // 3. Центральная острая грань
    g.poly([-size * 0.4, -size * 0.3, 0, size, size * 0.4, -size * 0.3, 0, -size]);
    g.fill(0xff80ab); // Светлый блеск

    // 4. Левая корона грань
    g.poly([-size, -size * 0.3, -size * 0.6, -size, -size * 0.4, -size * 0.3]);
    g.fill(0xc2185b);

    // 5. Правая корона грань
    g.poly([size, -size * 0.3, size * 0.6, -size, size * 0.4, -size * 0.3]);
    g.fill(0xff80ab);

    // 6. Блик белого света на главной грани
    g.moveTo(-size * 0.3, -size * 0.7);
    g.lineTo(0, -size * 0.9);
    g.lineTo(size * 0.3, -size * 0.7);
    g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.9, cap: 'round' });

    container.addChild(g);
    return container;
  },

  /**
   * Рисует сочную неоновую зелёную стрелку вверх ⬆️ (без серого смайлика)
   * @param {number} size
   * @returns {Container}
   */
  createUpArrowIcon: (size = 9) => {
    const container = new Container();

    // Тень стрелки
    const shadow = new Graphics();
    shadow.poly([0, -size + 2, -size * 0.7, 1, -size * 0.3, 1, -size * 0.3, size + 2, size * 0.3, size + 2, size * 0.3, 1, size * 0.7, 1]);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    container.addChild(shadow);

    const arrow = new Graphics();
    // Наконечник треугольник + хвостик
    arrow.poly([
      0, -size,
      -size * 0.75, 0,
      -size * 0.3, 0,
      -size * 0.3, size,
      size * 0.3, size,
      size * 0.3, 0,
      size * 0.75, 0
    ]);
    arrow.fill(0x2ecc71); // Изумрудно-зеленый неон
    arrow.stroke({ color: 0xffffff, width: 1.2, alpha: 0.8 });
    container.addChild(arrow);

    return container;
  },

  /**
   * Рисует сочную глянцевую 3D кнопку
   */
  createButton: (x, y, width, height, text, color = 0x2ecc71, onClick = () => {}) => {
    const container = new Container();
    container.position.set(x, y);

    // 1. Тень
    const shadow = new Graphics();
    shadow.roundRect(0, 4, width, height, 16);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    container.addChild(shadow);

    // 2. Тело кнопки
    const bg = new Graphics();
    bg.roundRect(0, 0, width, height, 16);
    bg.fill(color);
    bg.stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
    container.addChild(bg);

    // 3. Блик сверху
    const shine = new Graphics();
    shine.roundRect(2, 2, width - 4, Math.floor(height * 0.45), 14);
    shine.fill({ color: 0xffffff, alpha: 0.2 });
    container.addChild(shine);

    // 4. Текст
    const font = CONFIG.FONT_FAMILY || 'Fredoka, sans-serif';
    const btnStyle = new TextStyle({
      fontFamily: font,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.6, blur: 2, distance: 1 }
    });
    const label = new Text({ text, style: btnStyle });
    label.anchor.set(0.5);
    label.position.set(width / 2, height / 2);
    container.addChild(label);

    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', onClick);

    return container;
  }
};
