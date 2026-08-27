import { Container, Graphics, FillGradient } from 'pixi.js';

/**
 * Рисованный интерфейс (TASK-119).
 *
 * Планка задана образцом казуальной игры: там ни одного плоского элемента —
 * глянцевый пластик кнопок, объёмные панели, утопленные ячейки, всё освещено
 * сверху одним источником. Наши коты уже нарисованы в этом регистре и сейчас
 * спорят с плоским интерфейсом вокруг.
 *
 * Растрового арта здесь нет намеренно: материал делается кодом — градиент тела,
 * тёмный кант, верхний блик, нижняя внутренняя тень, падающая тень под фигурой.
 * Ноль килобайт веса, а в мини-аппе время до первого кадра влияет на удержание.
 *
 * ЕДИНЫЕ ПРАВИЛА, без них набор развалится:
 *   - свет всегда сверху: верх светлее, низ темнее, тень падает вниз;
 *   - выпуклое (кнопки, панели, чипы) — светлеет кверху;
 *   - утопленное (ячейки, прогресс-жёлоба) — темнеет кверху, ровно наоборот;
 *   - кант всегда темнее тела, блик всегда белый и полупрозрачный.
 */

/** Осветлить/затемнить цвет: k > 0 — светлее, k < 0 — темнее. */
export function shade(color, k) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c) => {
    const v = k >= 0 ? c + (255 - c) * k : c * (1 + k);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/**
 * Вертикальный градиент сверху вниз.
 *
 * Координаты НОРМАЛИЗОВАННЫЕ (0..1), а не пиксельные: в Pixi 8 у градиента по
 * умолчанию локальное пространство текстуры. Передашь пиксели — фигура
 * сэмплирует самый край и красится одним крайним цветом: кнопка выцветает в
 * белую, ячейка чернеет. Именно так и вышло с первого раза.
 */
function verticalGradient(stops) {
  const grad = new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    textureSpace: 'local'
  });
  // ВАЖНО: addColorStop принимает ДВА аргумента. Альфа третьим параметром молча
  // игнорируется, и полупрозрачный блик превращается в сплошной белый, а мягкая
  // тень — в сплошной чёрный. Прозрачность приходится вносить в сам цвет.
  stops.forEach(([offset, color, alpha]) => grad.addColorStop(offset, rgba(color, alpha)));
  return grad;
}

/** Цвет со сплошной или заданной прозрачностью в формате, который понимает Pixi. */
function rgba(color, alpha) {
  if (alpha === undefined) return color;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Глянцевая выпуклая кнопка.
 *
 * Слои снизу вверх: падающая тень → тёмный кант → тело с градиентом →
 * верхний блик → нижняя внутренняя тень. Именно эта стопка, а не один цвет,
 * читается как «пластиковая кнопка», а не «прямоугольник».
 *
 * @returns {Container} с методом `setPressed(bool)`
 */
export function glossyButton(width, height, color, options = {}) {
  const radius = options.radius !== undefined ? options.radius : 16;
  const shadowDepth = options.shadowDepth !== undefined ? options.shadowDepth : 4;

  const box = new Container();

  const shadow = new Graphics();
  shadow.roundRect(0, shadowDepth, width, height, radius).fill({ color: 0x000000, alpha: 0.42 });
  box.addChild(shadow);

  const body = new Graphics();
  // Кант — не отдельная линия, а фигура под телом: так он не «съедает» скругление.
  body.roundRect(0, 0, width, height, radius).fill({ color: shade(color, -0.45) });
  body.roundRect(1.5, 1.5, width - 3, height - 3, radius - 1.5).fill(
    verticalGradient([
      [0, shade(color, 0.28)],
      [0.5, color],
      [1, shade(color, -0.22)]
    ])
  );
  box.addChild(body);

  // Верхний блик: короткий, до 45% высоты, иначе кнопка выглядит мокрой.
  const gloss = new Graphics();
  gloss.roundRect(3.5, 3, width - 7, height * 0.45, radius - 3).fill(
    verticalGradient([
      [0, 0xffffff, 0.34],
      [1, 0xffffff, 0.04]
    ])
  );
  box.addChild(gloss);

  // Нижняя внутренняя тень — «толщина» пластика.
  const innerShadow = new Graphics();
  innerShadow.roundRect(3.5, height * 0.62, width - 7, height * 0.34, radius - 4).fill(
    verticalGradient([
      [0, 0x000000, 0],
      [1, 0x000000, 0.22]
    ])
  );
  box.addChild(innerShadow);

  const content = new Container();
  box.addChild(content);
  box.content = content;

  box.setPressed = (pressed) => {
    // Нажатие: кнопка садится на тень, а не просто уменьшается.
    const drop = pressed ? shadowDepth : 0;
    body.y = drop;
    gloss.y = drop;
    innerShadow.y = drop;
    content.y = drop;
    shadow.alpha = pressed ? 0.2 : 1;
  };

  return box;
}

/**
 * Выпуклая панель: HUD-чипы, карточки, шапки.
 * Тот же свет, но мягче — панель не должна спорить с кнопкой за внимание.
 */
export function raisedPanel(width, height, color, options = {}) {
  const radius = options.radius !== undefined ? options.radius : 18;
  const strokeColor = options.stroke !== undefined ? options.stroke : shade(color, 0.45);

  const g = new Graphics();
  g.roundRect(0, 2.5, width, height, radius).fill({ color: 0x000000, alpha: 0.32 });
  g.roundRect(0, 0, width, height, radius).fill(
    verticalGradient([
      [0, shade(color, 0.22)],
      [1, shade(color, -0.12)]
    ])
  );
  g.roundRect(0.75, 0.75, width - 1.5, height - 1.5, radius - 0.75)
    .stroke({ color: strokeColor, width: 1.5, alpha: options.strokeAlpha !== undefined ? options.strokeAlpha : 0.55 });
  // Тонкая световая кромка по верхнему краю — читается как фаска.
  g.roundRect(3, 1.5, width - 6, height * 0.4, radius - 3).fill(
    verticalGradient([
      [0, 0xffffff, 0.14],
      [1, 0xffffff, 0]
    ])
  );
  return g;
}

/**
 * Утопленная ячейка: клетка поля, жёлоб прогресса.
 * Свет тот же, но градиент перевёрнут — тёмное сверху. На этом и держится
 * ощущение углубления.
 */
export function insetCell(width, height, color, options = {}) {
  const radius = options.radius !== undefined ? options.radius : 16;

  const g = new Graphics();
  g.roundRect(0, 0, width, height, radius).fill(
    verticalGradient([
      [0, shade(color, -0.16)],
      [0.45, color],
      [1, shade(color, 0.10)]
    ])
  );
  // Тень от верхнего края внутрь.
  g.roundRect(1, 1, width - 2, height * 0.5, radius - 1).fill(
    verticalGradient([
      [0, 0x000000, 0.14],
      [1, 0x000000, 0]
    ])
  );
  g.roundRect(0.75, 0.75, width - 1.5, height - 1.5, radius - 0.75)
    .stroke({ color: shade(color, 0.3), width: 1, alpha: 0.5 });
  return g;
}

export default { glossyButton, raisedPanel, insetCell, shade };
