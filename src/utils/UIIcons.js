import { Graphics } from 'pixi.js';

/**
 * Векторные иконки интерфейса (TASK-118).
 *
 * Зачем: до этого иконками служили эмодзи прямо в тексте кнопок — `🐱 Купить`,
 * `📦 Заполнить`, `⚡ Соединить`. Это самый громкий признак самодельной игры.
 * Эмодзи рисует системный шрифт: на каждой платформе своя форма, свои цвета,
 * своя перспектива и свой вес. Ни в одну сетку они не встают и с фирменной
 * палитрой не дружат.
 *
 * Все иконки здесь — обычные `Graphics`: масштабируются без потерь, красятся в
 * нужный цвет, весят ноль байт и выглядят одинаково везде.
 *
 * Правила, чтобы набор не расползся:
 *   - рисуем в квадрате 24×24 и масштабируем под нужный размер;
 *   - толщина линий 2 при размере 24, то есть пропорционально размеру;
 *   - никаких мелких деталей: на 16px они превратятся в кашу.
 */

const BASE = 24;

function scaled(icon, size) {
  const k = size / BASE;
  icon.scale.set(k);
  return icon;
}

/** Кошачья лапка — покупка кота. */
export function paw(size = 20, color = 0xffffff) {
  const g = new Graphics();
  g.ellipse(12, 15.4, 5.2, 4.3).fill({ color });
  g.ellipse(6.4, 9.6, 2.2, 2.9).fill({ color });
  g.ellipse(10.6, 7.2, 2.1, 2.8).fill({ color });
  g.ellipse(15.2, 7.6, 2.1, 2.8).fill({ color });
  g.ellipse(18.6, 10.6, 2.1, 2.7).fill({ color });
  return scaled(g, size);
}

/** Ящик — «заполнить поле». */
export function box(size = 20, color = 0xffffff) {
  const g = new Graphics();
  g.moveTo(12, 3).lineTo(21, 7.5).lineTo(21, 17).lineTo(12, 21.5).lineTo(3, 17).lineTo(3, 7.5).closePath()
    .stroke({ color, width: 2, join: 'round' });
  g.moveTo(3, 7.5).lineTo(12, 12).lineTo(21, 7.5).stroke({ color, width: 2, join: 'round' });
  g.moveTo(12, 12).lineTo(12, 21.5).stroke({ color, width: 2 });
  return scaled(g, size);
}

/** Молния — авто-слияние. */
export function bolt(size = 20, color = 0xffffff) {
  const g = new Graphics();
  g.moveTo(13.5, 2).lineTo(5, 13.5).lineTo(11, 13.5).lineTo(10, 22).lineTo(19, 10).lineTo(13, 10).closePath()
    .fill({ color });
  return scaled(g, size);
}

/** Книга — котопедия. */
export function book(size = 20, color = 0xffffff) {
  const g = new Graphics();
  g.moveTo(4, 5).lineTo(11, 5).lineTo(11, 19.5).lineTo(4, 19.5).closePath().stroke({ color, width: 2, join: 'round' });
  g.moveTo(13, 5).lineTo(20, 5).lineTo(20, 19.5).lineTo(13, 19.5).closePath().stroke({ color, width: 2, join: 'round' });
  g.moveTo(12, 4).lineTo(12, 20).stroke({ color, width: 2 });
  return scaled(g, size);
}

/** Замок — закрытый уровень. */
export function lock(size = 20, color = 0xffffff) {
  const g = new Graphics();
  g.roundRect(5, 10.4, 14, 9.6, 2.4).stroke({ color, width: 2 });
  g.moveTo(8.4, 10.4).lineTo(8.4, 8).arc(12, 8, 3.6, Math.PI, 0).lineTo(15.6, 10.4)
    .stroke({ color, width: 2, cap: 'round' });
  return scaled(g, size);
}

/** Крестик — закрыть. */
export function cross(size = 18, color = 0xffffff) {
  const g = new Graphics();
  g.moveTo(6, 6).lineTo(18, 18).moveTo(18, 6).lineTo(6, 18).stroke({ color, width: 2.4, cap: 'round' });
  return scaled(g, size);
}

/** Галочка — выполнено. */
export function check(size = 18, color = 0x6bd97f) {
  const g = new Graphics();
  g.moveTo(5, 12.6).lineTo(9.4, 17).lineTo(19, 7.4).stroke({ color, width: 2.6, cap: 'round', join: 'round' });
  return scaled(g, size);
}

/** Экран с треугольником — ролик за награду. */
export function video(size = 20, color = 0xffffff) {
  const g = new Graphics();
  g.roundRect(2.6, 5, 18.8, 14, 3.2).stroke({ color, width: 1.9 });
  g.moveTo(10.4, 9.6).lineTo(15.2, 12).lineTo(10.4, 14.4).closePath().fill({ color });
  return scaled(g, size);
}

/** Вопрос в круге — обучение. */
export function help(size = 18, color = 0xffffff) {
  const g = new Graphics();
  g.circle(12, 12, 8.6).stroke({ color, width: 1.9 });
  g.moveTo(9.4, 9.6).arc(12, 9.6, 2.6, Math.PI, 0.4 * Math.PI).stroke({ color, width: 1.9, cap: 'round' });
  g.moveTo(12, 12.6).lineTo(12, 14.6).stroke({ color, width: 1.9, cap: 'round' });
  g.circle(12, 17.4, 1.05).fill({ color });
  return scaled(g, size);
}

/** Кубок — вершина мира. */
export function trophy(size = 22, color = 0xffd15c) {
  const g = new Graphics();
  g.moveTo(7, 4).lineTo(17, 4).lineTo(17, 10).arc(12, 10, 5, 0, Math.PI).closePath().fill({ color });
  g.moveTo(7, 5.5).lineTo(4, 5.5).lineTo(4, 8).arc(6.5, 8, 2.5, Math.PI, 0).stroke({ color, width: 1.8 });
  g.moveTo(17, 5.5).lineTo(20, 5.5).lineTo(20, 8).arc(17.5, 8, 2.5, Math.PI, 0).stroke({ color, width: 1.8 });
  g.rect(10.6, 15, 2.8, 3.6).fill({ color });
  g.roundRect(7.6, 18.4, 8.8, 2.4, 1.2).fill({ color });
  return scaled(g, size);
}

/** Подарок — ежедневная награда. */
export function gift(size = 20, color = 0xffd15c) {
  const g = new Graphics();
  g.roundRect(4, 10, 16, 10.5, 2).stroke({ color, width: 2, join: 'round' });
  g.roundRect(3, 6.4, 18, 4, 1.6).stroke({ color, width: 2, join: 'round' });
  g.moveTo(12, 6.4).lineTo(12, 20.5).stroke({ color, width: 2 });
  return scaled(g, size);
}


/**
 * Поставить иконку и подпись как одну центрированную пару.
 *
 * Иконка — отдельный объект, а не символ внутри строки, поэтому центровать
 * приходится вручную: сама по себе подпись про иконку ничего не знает. Функция
 * возвращает `relayout`, потому что подписи на кнопках меняются на ходу
 * («Заполнить» → «Заполнено»), и после смены текста пару надо пересобрать.
 *
 * @returns {{relayout: () => void}}
 */
export function centerIconLabel(icon, label, centerX, topY, gap = 6) {
  const relayout = () => {
    const iconW = icon.width;
    const iconH = icon.height;
    const textW = label.width;
    const total = iconW + gap + textW;
    const left = centerX - total / 2;

    icon.position.set(left, topY + Math.max(0, (label.height - iconH) / 2));
    // У подписи якорь по центру: сдвигаем её вправо на половину пары.
    label.position.set(left + iconW + gap + textW / 2, topY);
  };
  relayout();
  return { relayout };
}

export default { paw, box, bolt, book, lock, cross, check, video, help, trophy, gift, centerIconLabel };
