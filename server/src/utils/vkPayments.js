import crypto from 'node:crypto';
import querystring from 'node:querystring';

export const PAYMENT_RUBY_PACKS = [
  { id: 'gems_pack_10', rubies: 10, votes: 1, title: 'Старт' },
  { id: 'gems_pack_50', rubies: 50, votes: 4, title: 'Супер' },
  { id: 'gems_pack_150', rubies: 150, votes: 10, title: 'Империя' },
  { id: 'starter_tribute_5', rubies: 80, votes: 5, title: 'Ларец первого трона' },
  { id: 'edict_seven_nights', rubies: 40, votes: 8, title: 'Указ семи ночей' }
];

const PHOTO_URL = 'https://no1zilla.github.io/cat-empire/assets/cats/green_eyes_gift.jpg';

export function getPaymentRubyPack(itemId) {
  return PAYMENT_RUBY_PACKS.find((pack) => pack.id === String(itemId || '')) || null;
}

export function vkPaymentError(code, msg) {
  return { error: { error_code: code, error_msg: msg, critical: true } };
}

/** VK шлёт пары key=value; все значения в подписи — строки. */
export function normalizeVkPaymentParams(input) {
  if (!input) return {};
  if (typeof input === 'string') {
    return normalizeVkPaymentParams(querystring.parse(input.replace(/^\?/, '')));
  }
  if (typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (!key) continue;
    if (value == null || typeof value === 'function') continue;
    if (typeof value === 'object') continue;
    out[key] = String(value);
  }
  return out;
}

/**
 * Подпись уведомлений VK Payments: md5(key=value... + secret)
 * https://dev.vk.com/ru/api/payments/notifications/get-item
 */
export function verifyVkPaymentSig(params, secret) {
  if (!secret || !params || !params.sig) return false;
  const normalized = normalizeVkPaymentParams(params);
  const sig = String(normalized.sig || params.sig || '').toLowerCase();
  const keys = Object.keys(normalized).filter((key) => key !== 'sig').sort();
  const raw = keys.map((key) => `${key}=${normalized[key]}`).join('') + secret;
  const digest = crypto.createHash('md5').update(raw).digest('hex');
  return digest === sig;
}

export function packToVkItem(pack) {
  const title = `${pack.title}: ${pack.rubies} рубинов`.slice(0, 48);
  return {
    item_id: String(pack.id),
    title,
    photo_url: PHOTO_URL,
    price: Number(pack.votes)
  };
}

function asVkInt(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function handleVkPaymentNotification(params = {}, secret = '') {
  const normalized = normalizeVkPaymentParams(params);
  const type = String(normalized.notification_type || '');

  if (secret) {
    if (!normalized.sig || !verifyVkPaymentSig(normalized, secret)) {
      return vkPaymentError(10, 'Invalid signature');
    }
  }

  if (type === 'get_item' || type === 'get_item_test') {
    const pack = getPaymentRubyPack(normalized.item || normalized.item_id);
    if (!pack) {
      return vkPaymentError(20, 'Unknown item');
    }
    return { response: packToVkItem(pack) };
  }

  if (type === 'order_status_change' || type === 'order_status_change_test') {
    const orderId = asVkInt(normalized.order_id);
    if (!orderId) {
      return vkPaymentError(11, 'Missing order_id');
    }
    return {
      response: {
        order_id: orderId,
        app_order_id: orderId
      }
    };
  }

  return vkPaymentError(11, 'Unknown notification');
}
