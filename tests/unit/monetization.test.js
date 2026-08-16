import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  RUBY_PACKS,
  getRubyPack,
  INCOME_BOOSTER_MS,
  INCOME_BOOSTER_MULTIPLIER,
  RUBY_AD_REWARD
} from '../../src/config/rubyShop.js';
import { IncomeBoosterService } from '../../src/game/IncomeBooster.js';
import { Economy } from '../../src/game/Economy.js';
import {
  getPaymentRubyPack,
  handleVkPaymentNotification,
  verifyVkPaymentSig
} from '../../server/src/utils/vkPayments.js';

function memoryStorage(seed = {}) {
  const map = { ...seed };
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null),
    setItem: (key, value) => { map[key] = String(value); }
  };
}

function signPayment(params, secret) {
  const keys = Object.keys(params).filter((key) => key !== 'sig').sort();
  const raw = keys.map((key) => `${key}=${params[key]}`).join('') + secret;
  return crypto.createHash('md5').update(raw).digest('hex');
}

export function runMonetizationTests() {
  console.log('🧪 Тестирование кассы: паки рубинов, 2× бустер, callback VK...');

  assert.strictEqual(RUBY_PACKS.length, 3);
  assert.deepStrictEqual(RUBY_PACKS.map((pack) => pack.id), [
    'gems_pack_10',
    'gems_pack_50',
    'gems_pack_150'
  ]);
  assert.strictEqual(getRubyPack('gems_pack_10').rubies, 10);
  assert.strictEqual(getRubyPack('gems_pack_10').votes, 1);
  assert.strictEqual(getRubyPack('gems_pack_50').rubies, 50);
  assert.strictEqual(getRubyPack('gems_pack_50').votes, 4);
  assert.strictEqual(getRubyPack('gems_pack_150').rubies, 150);
  assert.strictEqual(getRubyPack('gems_pack_150').votes, 10);
  assert.strictEqual(getRubyPack('unknown'), null);
  assert.strictEqual(RUBY_AD_REWARD, 5);
  assert.strictEqual(INCOME_BOOSTER_MS, 30 * 60 * 1000);
  assert.strictEqual(INCOME_BOOSTER_MULTIPLIER, 2);

  const clientIds = RUBY_PACKS.map((pack) => pack.id);
  clientIds.forEach((id) => {
    const serverPack = getPaymentRubyPack(id);
    const clientPack = getRubyPack(id);
    assert.ok(serverPack, `Сервер должен знать пак ${id}`);
    assert.strictEqual(serverPack.rubies, clientPack.rubies);
    assert.strictEqual(serverPack.votes, clientPack.votes);
  });

  const now = 1_700_000_000_000;
  const booster = new IncomeBoosterService(memoryStorage());
  assert.strictEqual(booster.isActive(now), false);
  assert.strictEqual(booster.getMultiplier(now), 1);
  assert.strictEqual(booster.remainingMs(now), 0);

  const expiresAt = booster.activate(now);
  assert.strictEqual(expiresAt, now + INCOME_BOOSTER_MS);
  assert.strictEqual(booster.isActive(now + 1000), true);
  assert.strictEqual(booster.getMultiplier(now + 1000), 2);
  assert.strictEqual(booster.remainingMs(now + 1000), INCOME_BOOSTER_MS - 1000);
  assert.strictEqual(booster.isActive(expiresAt), false);
  assert.strictEqual(booster.getMultiplier(expiresAt), 1);

  const restored = new IncomeBoosterService(memoryStorage({
    cat_empire_booster_expires_at: String(now + 60_000)
  }));
  assert.strictEqual(restored.isActive(now), true, 'Бустер должен переживать рестарт');
  assert.strictEqual(restored.remainingMs(now), 60_000);

  const economy = new Economy({
    slots: [{ level: 1 }, { level: 2 }, null]
  });
  economy.setBalance(0, 0);
  assert.strictEqual(economy.incomePerSecond, 3, '1 + 2 дохода без бустера');
  economy.setIncomeMultiplier(2);
  assert.strictEqual(economy.incomePerSecond, 6, 'Доход ×2 на 30 мин');
  economy.setIncomeMultiplier(1);
  assert.strictEqual(economy.incomePerSecond, 3);

  const secret = 'test_secret';
  const getItem = {
    app_id: '1',
    item: 'gems_pack_50',
    notification_type: 'get_item',
    user_id: '7'
  };
  getItem.sig = signPayment(getItem, secret);
  assert.strictEqual(verifyVkPaymentSig(getItem, secret), true);

  const itemRes = handleVkPaymentNotification(getItem, secret);
  assert.strictEqual(itemRes.response.item_id, 'gems_pack_50');
  assert.strictEqual(itemRes.response.price, 4);
  assert.ok(String(itemRes.response.title).includes('рубинов'));

  const badSig = { ...getItem, sig: 'deadbeef' };
  const badRes = handleVkPaymentNotification(badSig, secret);
  assert.strictEqual(badRes.error.error_code, 10);

  const unknown = {
    notification_type: 'get_item',
    item: 'gems_pack_999'
  };
  unknown.sig = signPayment(unknown, secret);
  const unknownRes = handleVkPaymentNotification(unknown, secret);
  assert.strictEqual(unknownRes.error.error_code, 20);

  const order = {
    app_order_id: '42',
    notification_type: 'order_status_change',
    status: 'chargeable'
  };
  order.sig = signPayment(order, secret);
  const orderRes = handleVkPaymentNotification(order, secret);
  assert.strictEqual(orderRes.response.order_id, '42');

  console.log('  ✅ Касса, бустер 2× и callback VK прошли автотесты');
}
