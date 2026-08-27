import assert from 'node:assert';
import { handleTelegramUpdate } from '../../server/src/routes/stars.js';
import { findStarsItem, STARS_CATALOG } from '../../server/src/utils/starsCatalog.js';
import { playerKey, parsePlayerKey } from '../../server/src/utils/playerKey.js';

function paymentUpdate({ key = 'tg:4242', itemId = 'gems_pack_50', chargeId = 'charge_1', amount = 200 } = {}) {
  return {
    message: {
      successful_payment: {
        currency: 'XTR',
        total_amount: amount,
        invoice_payload: JSON.stringify({ k: key, i: itemId, t: Date.now() }),
        telegram_payment_charge_id: chargeId
      }
    }
  };
}

function harness({ granted = new Set() } = {}) {
  const calls = { grants: [], records: [], preCheckoutOk: [], preCheckoutRejected: [] };
  return {
    calls,
    deps: {
      grantGems: async (key, amount) => { calls.grants.push([key, amount]); },
      alreadyGranted: async (chargeId) => granted.has(String(chargeId)),
      record: async (payload) => {
        calls.records.push(payload);
        granted.add(String(payload.chargeId));
      },
      answerPreCheckout: async (id) => { calls.preCheckoutOk.push(id); },
      rejectPreCheckout: async (id) => { calls.preCheckoutRejected.push(id); }
    }
  };
}

export async function runStarsPaymentsTests() {
  console.log('🧪 Тестирование покупок за Telegram Stars...');

  // Ключи игроков из разных платформ не должны совпадать.
  assert.strictEqual(playerKey({ platform: 'vk', externalId: '4242' }), '4242');
  assert.strictEqual(playerKey({ platform: 'telegram', externalId: '4242' }), 'tg:4242');
  assert.notStrictEqual(
    playerKey({ platform: 'vk', externalId: '4242' }),
    playerKey({ platform: 'telegram', externalId: '4242' }),
    'Один и тот же номер в VK и Telegram — разные игроки'
  );
  assert.deepStrictEqual(parsePlayerKey('tg:4242'), { platform: 'telegram', externalId: '4242' });
  assert.deepStrictEqual(parsePlayerKey('816275327'), { platform: 'vk', externalId: '816275327' });

  // Каталог: цены и количество товара живут на сервере.
  assert.strictEqual(findStarsItem('gems_pack_50').rubies, 50);
  assert.strictEqual(findStarsItem('нет такого'), null, 'Неизвестный товар не продаётся');
  Object.values(STARS_CATALOG).forEach((item) => {
    assert.ok(item.stars > 0, `${item.id}: цена в звёздах должна быть положительной`);
    assert.ok(item.rubies > 0, `${item.id}: покупка должна что-то давать`);
  });

  // --- Успешная оплата выдаёт ровно то, что записано в каталоге ---
  const ok = harness();
  const granted = await handleTelegramUpdate(paymentUpdate(), ok.deps);
  assert.strictEqual(granted.handled, 'granted');
  assert.deepStrictEqual(ok.calls.grants, [['tg:4242', 50]], 'Рубины берутся из каталога, а не из апдейта');
  assert.strictEqual(ok.calls.records.length, 1, 'Выдача записана в аналитику');
  assert.strictEqual(ok.calls.records[0].chargeId, 'charge_1');

  // --- Повторная доставка того же платежа не выдаёт товар дважды ---
  const repeat = await handleTelegramUpdate(paymentUpdate(), ok.deps);
  assert.strictEqual(repeat.handled, 'duplicate', 'Ретрай Telegram не должен удваивать выдачу');
  assert.strictEqual(ok.calls.grants.length, 1, 'Второго начисления не произошло');

  // --- Подделанный payload не выдаёт ничего ---
  const bad = harness();
  const unknownItem = await handleTelegramUpdate(
    paymentUpdate({ itemId: 'gems_pack_9000', chargeId: 'charge_2' }),
    bad.deps
  );
  assert.strictEqual(unknownItem.handled, 'bad_payload', 'Товара нет в каталоге — выдавать нечего');
  assert.strictEqual(bad.calls.grants.length, 0);

  const brokenJson = await handleTelegramUpdate({
    message: { successful_payment: { invoice_payload: 'не json', telegram_payment_charge_id: 'c3' } }
  }, bad.deps);
  assert.strictEqual(brokenJson.handled, 'bad_payload');
  assert.strictEqual(bad.calls.grants.length, 0);

  // --- Сумма из апдейта не влияет на выдачу ---
  const cheap = harness();
  await handleTelegramUpdate(paymentUpdate({ chargeId: 'charge_4', amount: 1 }), cheap.deps);
  assert.deepStrictEqual(
    cheap.calls.grants,
    [['tg:4242', 50]],
    'Даже если в апдейте одна звезда, выдаём по каталогу — цену определяет сервер'
  );

  // --- pre_checkout: известный товар подтверждаем, неизвестный отклоняем ---
  const pre = harness();
  await handleTelegramUpdate({
    pre_checkout_query: { id: 'q1', invoice_payload: JSON.stringify({ k: 'tg:1', i: 'gems_pack_10' }) }
  }, pre.deps);
  assert.deepStrictEqual(pre.calls.preCheckoutOk, ['q1']);

  await handleTelegramUpdate({
    pre_checkout_query: { id: 'q2', invoice_payload: JSON.stringify({ k: 'tg:1', i: 'нет такого' }) }
  }, pre.deps);
  assert.deepStrictEqual(pre.calls.preCheckoutRejected, ['q2'], 'Снятый с продажи товар не подтверждаем');

  // --- Посторонние апдейты игнорируются молча ---
  const idle = harness();
  const ignored = await handleTelegramUpdate({ message: { text: 'привет' } }, idle.deps);
  assert.strictEqual(ignored.handled, 'ignored');
  assert.strictEqual(idle.calls.grants.length, 0);

  console.log('  ✅ Начисляет сервер по вебхуку, дубли гасятся, цену диктует каталог');
}
