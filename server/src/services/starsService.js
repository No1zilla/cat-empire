import { findStarsItem } from '../utils/starsCatalog.js';

/**
 * Разбор платёжных апдейтов Telegram (TASK-114).
 *
 * Модуль намеренно НЕ импортирует ни express, ни pg: HTTP и база — это оболочка,
 * а здесь живёт решение «кому и что выдать». Помимо чистоты у этого есть прямая
 * практическая польза: тесты в корневом `npm test` не должны тянуть серверные
 * зависимости, которых в корневом node_modules нет (и в CI взяться неоткуда).
 *
 * Все внешние действия приходят через `deps` — начисление, проверка дубля, запись
 * в аналитику, ответы Telegram. Роут подставляет боевые реализации, тест — свои.
 */

export async function handleTelegramUpdate(update, deps = {}) {
  const {
    grantGems,
    alreadyGranted,
    record,
    answerPreCheckout,
    rejectPreCheckout
  } = deps;

  // Шаг 1: Telegram спрашивает, подтверждаем ли платёж. Молчание = отказ игроку.
  if (update && update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    let known = false;
    try {
      const parsed = JSON.parse(query.invoice_payload || '{}');
      known = Boolean(findStarsItem(parsed.i));
    } catch (e) {
      known = false;
    }

    if (!known) {
      if (rejectPreCheckout) await rejectPreCheckout(query.id);
      return { handled: 'pre_checkout_rejected' };
    }
    if (answerPreCheckout) await answerPreCheckout(query.id);
    return { handled: 'pre_checkout_ok' };
  }

  // Шаг 2: деньги прошли — выдаём товар.
  const payment = update && update.message && update.message.successful_payment;
  if (!payment) return { handled: 'ignored' };

  let parsed = null;
  try {
    parsed = JSON.parse(payment.invoice_payload || '{}');
  } catch (e) {
    parsed = null;
  }

  const item = findStarsItem(parsed && parsed.i);
  const key = parsed && parsed.k;
  if (!item || !key) {
    console.error('successful_payment с непонятным payload:', payment.invoice_payload);
    return { handled: 'bad_payload' };
  }

  // Telegram ретраит доставку: без этой проверки один платёж выдал бы товар дважды.
  const chargeId = payment.telegram_payment_charge_id;
  if (alreadyGranted && (await alreadyGranted(chargeId))) {
    return { handled: 'duplicate', chargeId };
  }

  // Количество берётся из каталога, а не из апдейта: сумма в апдейте — это то,
  // что заплатили, а не то, что причитается.
  await grantGems(key, item.rubies);
  if (record) await record({ key, item, chargeId, stars: payment.total_amount });

  return { handled: 'granted', key, itemId: item.id, rubies: item.rubies, chargeId };
}

export default handleTelegramUpdate;
