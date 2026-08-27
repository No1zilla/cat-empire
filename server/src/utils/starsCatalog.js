/**
 * Каталог покупок за Telegram Stars (TASK-114).
 *
 * Цены живут на СЕРВЕРЕ и только здесь. Клиент присылает идентификатор товара, а
 * не сумму: иначе достаточно поправить одно число в консоли, чтобы купить пак за
 * одну звезду. Ровно по той же причине количество рубинов берётся отсюда, а не из
 * ответа клиента.
 *
 * Валюта — XTR. Для неё Telegram требует ровно одну позицию в `prices`, а сумма
 * указывается в целых звёздах (не в сотых долях, как у обычных валют).
 */

export const STARS_CATALOG = {
  gems_pack_10: { id: 'gems_pack_10', title: 'Горсть рубинов', description: '10 рубинов — два авто-слияния', stars: 50, rubies: 10 },
  gems_pack_50: { id: 'gems_pack_50', title: 'Ларь рубинов', description: '50 рубинов — десять авто-слияний', stars: 200, rubies: 50 },
  gems_pack_150: { id: 'gems_pack_150', title: 'Сокровищница', description: '150 рубинов — на неделю вперёд', stars: 500, rubies: 150 },
  starter_tribute_5: { id: 'starter_tribute_5', title: 'Ларец первого трона', description: '80 рубинов и двойной доход на час', stars: 150, rubies: 80, boosterMs: 60 * 60 * 1000 },
  edict_seven_nights: { id: 'edict_seven_nights', title: 'Указ семи ночей', description: 'Двойной доход на семь дней и паёк рубинов', stars: 250, rubies: 40, edict: true }
};

/** @returns {Object|null} товар каталога или null, если такого нет. */
export function findStarsItem(itemId) {
  const key = String(itemId || '');
  return Object.prototype.hasOwnProperty.call(STARS_CATALOG, key) ? STARS_CATALOG[key] : null;
}

export default STARS_CATALOG;
