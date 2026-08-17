import crypto from 'node:crypto';

export const PAYMENT_RUBY_PACKS = [
  { id: 'gems_pack_10', rubies: 10, votes: 1, title: 'Старт' },
  { id: 'gems_pack_50', rubies: 50, votes: 4, title: 'Супер' },
  { id: 'gems_pack_150', rubies: 150, votes: 10, title: 'Империя' },
  { id: 'starter_tribute_5', rubies: 80, votes: 5, title: 'Ларец первого трона' },
  { id: 'edict_seven_nights', rubies: 40, votes: 8, title: 'Указ семи ночей' }
];

export function getPaymentRubyPack(itemId) {
  return PAYMENT_RUBY_PACKS.find((pack) => pack.id === String(itemId || '')) || null;
}

/**
 * Подпись уведомлений VK Payments: md5(key=value... + secret)
 * https://dev.vk.com/ru/api/payments/getting-started
 */
export function verifyVkPaymentSig(params, secret) {
  if (!secret || !params || !params.sig) return false;
  const keys = Object.keys(params).filter((key) => key !== 'sig').sort();
  const raw = keys.map((key) => `${key}=${params[key]}`).join('') + secret;
  const digest = crypto.createHash('md5').update(raw).digest('hex');
  return digest === String(params.sig).toLowerCase();
}

export function packToVkItem(pack) {
  return {
    item_id: pack.id,
    title: `${pack.title}: ${pack.rubies} рубинов`,
    photo_url: 'https://no1zilla.github.io/cat-empire/assets/cats/green_eyes_gift.jpg',
    price: pack.votes,
    discount: 0
  };
}

export function handleVkPaymentNotification(params = {}, secret = '') {
  const type = String(params.notification_type || '');

  if (secret) {
    if (!params.sig || !verifyVkPaymentSig(params, secret)) {
      return { error: { error_code: 10, error_msg: 'Invalid signature' } };
    }
  }

  if (type === 'get_item' || type === 'get_item_test') {
    const pack = getPaymentRubyPack(params.item || params.item_id);
    if (!pack) {
      return { error: { error_code: 20, error_msg: 'Unknown item' } };
    }
    return { response: packToVkItem(pack) };
  }

  if (type === 'order_status_change' || type === 'order_status_change_test') {
    const orderId = params.app_order_id || String(Date.now());
    return { response: { order_id: orderId } };
  }

  return { error: { error_code: 11, error_msg: 'Unknown notification' } };
}
