/**
 * Реестр обработанных заказов (TASK-112).
 *
 * Платформа может отдать один и тот же `orderId` дважды — при повторном колбэке,
 * при перезапуске игры на середине оплаты. Реестр не даёт выдать товар второй раз.
 *
 * ПОРЯДОК ВЫЗОВОВ — ЭТО И ЕСТЬ ЗАЩИТА ДЕНЕГ. Заказ помечается обработанным ТОЛЬКО
 * после того, как выдача реально сохранена. Наоборот — нельзя: если запись упадёт
 * между «пометили» и «сохранили», игрок заплатил, товара нет, а `wasOrderProcessed`
 * уже отвечает «зачислено» и повторить выдачу невозможно. Ровно так терялись
 * оплаченные рубины на путях «Указ» и «Ларец» (см. TASK-109, который закрыл только
 * паки рубинов).
 *
 * Правильная последовательность в вызывающем коде:
 *   1. platform.purchase(id)      — открыть кассу платформы
 *   2. wasOrderProcessed(orderId) — не выдавали ли уже
 *   3. выдать товар в памяти
 *   4. await persist(...)         — дождаться подтверждённого сохранения
 *   5. markOrderProcessed(orderId) — и только теперь сжечь заказ
 */

const PROCESSED_ORDERS_KEY = 'cat_empire_iap_orders';

/** Сколько последних заказов помним. Больше не нужно: дубли приходят сразу. */
const KEEP_LAST = 40;

function readOrders() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const list = JSON.parse(localStorage.getItem(PROCESSED_ORDERS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

/** Выдавали ли уже товар по этому заказу. */
export function wasOrderProcessed(orderId) {
  if (!orderId) return false;
  return readOrders().includes(String(orderId));
}

/**
 * Пометить заказ выданным. Звать ТОЛЬКО после подтверждённого сохранения выдачи.
 * @returns {boolean} удалось ли записать: false значит, что дубль мы не отловим.
 */
export function markOrderProcessed(orderId) {
  if (!orderId || typeof localStorage === 'undefined') return false;
  try {
    const next = readOrders();
    next.push(String(orderId));
    localStorage.setItem(PROCESSED_ORDERS_KEY, JSON.stringify(next.slice(-KEEP_LAST)));
    return true;
  } catch (e) {
    console.warn('Реестр заказов не записался:', e);
    return false;
  }
}

export default { wasOrderProcessed, markOrderProcessed };
