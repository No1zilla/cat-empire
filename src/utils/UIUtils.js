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
   * Векторный 3D Кошачий Домик с ушками на крыше 🏰
   */
  createCatHouseIcon: (size = 10) => {
    const container = new Container();

    const shadow = new Graphics();
    shadow.poly([-size, 2, 0, -size * 0.8 + 2, size, 2, size * 0.7, size + 2, -size * 0.7, size + 2]);
    shadow.fill({ color: 0x000000, alpha: 0.35 });
    container.addChild(shadow);

    const g = new Graphics();

    // Ушки на крыше
    g.poly([-size * 0.7, -size * 0.4, -size * 0.4, -size * 1.1, -size * 0.1, -size * 0.4]);
    g.fill(0xff7675);
    g.poly([size * 0.1, -size * 0.4, size * 0.4, -size * 1.1, size * 0.7, -size * 0.4]);
    g.fill(0xff7675);

    // Скатная коралловая крыша
    g.poly([-size, 0, 0, -size * 0.85, size, 0]);
    g.fill(0xff5e62);
    g.stroke({ color: 0xffffff, width: 1.2, alpha: 0.9 });

    // Стены домика
    g.roundRect(-size * 0.7, 0, size * 1.4, size * 0.9, 4);
    g.fill(0xffd700);
    g.stroke({ color: 0xb87c00, width: 1 });

    // Арочная дверца
    g.ellipse(0, size * 0.35, size * 0.3, size * 0.45);
    g.fill(0x2d3436);

    container.addChild(g);

    const shine = new Graphics();
    shine.moveTo(-size * 0.6, -size * 0.3);
    shine.lineTo(0, -size * 0.7);
    shine.stroke({ color: 0xffffff, width: 1.2, alpha: 0.8 });
    container.addChild(shine);

    return container;
  },

  /**
   * Векторная 3D Кавайная Розовая Лапка 🐾
   */
  createCatPawIcon: (size = 10) => {
    const container = new Container();

    const shadow = new Graphics();
    shadow.ellipse(0, size * 0.3 + 2, size * 0.8, size * 0.6);
    shadow.fill({ color: 0x000000, alpha: 0.35 });
    container.addChild(shadow);

    const g = new Graphics();
    g.ellipse(0, size * 0.25, size * 0.55, size * 0.45);
    g.fill(0xff7675);
    g.stroke({ color: 0xffffff, width: 1.2, alpha: 0.8 });

    const toeCoords = [
      { x: -size * 0.5, y: -size * 0.3, r: size * 0.2 },
      { x: -size * 0.2, y: -size * 0.6, r: size * 0.22 },
      { x: size * 0.2, y: -size * 0.6, r: size * 0.22 },
      { x: size * 0.5, y: -size * 0.3, r: size * 0.2 }
    ];

    toeCoords.forEach(t => {
      g.circle(t.x, t.y, t.r);
      g.fill(0xff7675);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.8 });
    });

    container.addChild(g);
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

    let lastClickTime = 0;
    const handleTap = (e) => {
      if (e) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }
      const now = Date.now();
      if (now - lastClickTime < 350) return;
      lastClickTime = now;

      // Визуальный отклик нажатия
      container.scale.set(0.95);
      setTimeout(() => {
        if (!container.destroyed) container.scale.set(1.0);
      }, 100);

      onClick(e);
    };

    container.on('pointertap', handleTap);
    container.on('pointerdown', (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    });

    return container;
  },

  /**
   * Показывает аккуратный неплавучий тост-уведомление вверху экрана
   */
  showToast: (stage, text) => {
    if (!stage) return;

    const gameWidth = CONFIG.GAME_WIDTH || 410;
    const toastW = 320;
    const toastH = 42;
    const toastX = (gameWidth - toastW) / 2;
    const toastY = 72;

    const toast = new Container();
    toast.position.set(toastX, toastY);
    toast.zIndex = 9999999;

    const bg = new Graphics();
    bg.roundRect(0, 0, toastW, toastH, 12);
    bg.fill({ color: 0x1e272c, alpha: 0.95 });
    bg.stroke({ color: 0xffa500, width: 1.5 });
    toast.addChild(bg);

    const style = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.8, blur: 2 }
    });

    const label = new Text({ text, style });
    label.anchor.set(0.5);
    label.position.set(toastW / 2, toastH / 2);
    toast.addChild(label);

    stage.sortableChildren = true;
    stage.addChild(toast);

    setTimeout(() => {
      if (toast.parent) toast.parent.removeChild(toast);
      toast.destroy();
    }, 2200);
  }
};
