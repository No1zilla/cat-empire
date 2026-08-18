import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  handleVkPaymentNotification,
  normalizeVkPaymentParams
} from '../../server/src/utils/vkPayments.js';

function signPayment(params, secret) {
  const keys = Object.keys(params).filter((key) => key !== 'sig').sort();
  const raw = keys.map((key) => `${key}=${params[key]}`).join('') + secret;
  return crypto.createHash('md5').update(raw).digest('hex');
}

export async function runVkPaymentHttpTests() {
  console.log('🧪 Callback VK: сырое тело кабинета get_item_test + order_status_change...');
  const secret = 'test_secret';

  const getItem = {
    app_id: '54702054',
    item: 'gems_pack_10',
    lang: 'ru_RU',
    notification_type: 'get_item_test',
    order_id: '2351003',
    receiver_id: '816275327',
    user_id: '816275327'
  };
  getItem.sig = signPayment(getItem, secret);
  const form = Object.keys(getItem).map((key) => `${key}=${getItem[key]}`).join('&');

  const fromRawBody = handleVkPaymentNotification(normalizeVkPaymentParams(form), secret);
  assert.strictEqual(fromRawBody.response.item_id, 'gems_pack_10');
  assert.strictEqual(fromRawBody.response.price, 1);
  assert.strictEqual(typeof fromRawBody.response.price, 'number');
  assert.strictEqual(fromRawBody.response.title, 'Старт: 10 рубинов');
  assert.ok(fromRawBody.response.title.length <= 48);
  assert.ok(fromRawBody.response.photo_url.startsWith('https://'));
  assert.strictEqual(JSON.stringify(fromRawBody).includes('<'), false);

  const fromQuery = handleVkPaymentNotification(getItem, secret);
  assert.strictEqual(fromQuery.response.price, 1);

  const order = {
    app_id: '54702054',
    item: 'gems_pack_10',
    notification_type: 'order_status_change_test',
    order_id: '2044861',
    status: 'chargeable',
    user_id: '816275327'
  };
  order.sig = signPayment(order, secret);
  const charged = handleVkPaymentNotification(order, secret);
  assert.strictEqual(charged.response.order_id, 2044861);
  assert.strictEqual(typeof charged.response.order_id, 'number');
  assert.strictEqual(charged.response.app_order_id, 2044861);

  const unsigned = handleVkPaymentNotification(
    normalizeVkPaymentParams('notification_type=get_item_test&item=gems_pack_10'),
    secret
  );
  assert.strictEqual(unsigned.error.error_code, 10);
  assert.strictEqual(unsigned.error.critical, true);

  console.log('  ✅ «Старт» / 1 голос JSON, без HTML, order_id числом как требует VK');
}
