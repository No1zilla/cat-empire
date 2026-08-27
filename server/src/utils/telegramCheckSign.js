import crypto from 'crypto';

/**
 * Проверка подписи Telegram Mini Apps (initData).
 *
 * Клиент отдаёт строку `initData` вида `query_id=...&user=...&auth_date=...&hash=...`.
 * Всё, кроме `hash`, подписано ботом. Схема из документации Telegram:
 *
 *   data_check_string = поля, кроме hash и signature, отсортированные по имени,
 *                       склеенные как `key=value` через перевод строки
 *   secret_key        = HMAC_SHA256(ключ: "WebAppData", данные: <токен бота>)
 *   ожидаемый hash    = HMAC_SHA256(ключ: secret_key, данные: data_check_string) в hex
 *
 * Порядок аргументов у HMAC здесь принципиален и легко путается: сначала строкой
 * "WebAppData" подписывается ТОКЕН, и только полученный ключ подписывает данные.
 *
 * `signature` исключается вместе с `hash`: это отдельная Ed25519-подпись Telegram
 * для сторонней валидации, в data_check_string она не входит.
 */

/** Сколько считаем initData свежей. Сутки — как в примерах Telegram. */
export const DEFAULT_MAX_AGE_SEC = 86400;

function buildDataCheckString(params) {
  return Object.keys(params)
    .filter((key) => key !== 'hash' && key !== 'signature')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('\n');
}

/** Разбор initData без потери значений: у `user` внутри JSON есть и `&`, и `=`. */
export function parseInitData(initData) {
  const out = {};
  const raw = String(initData || '').replace(/^[?#]+/, '');
  if (!raw) return out;
  for (const chunk of raw.split('&')) {
    if (!chunk) continue;
    const eq = chunk.indexOf('=');
    if (eq === -1) continue;
    const key = decodeURIComponent(chunk.slice(0, eq));
    const value = decodeURIComponent(chunk.slice(eq + 1));
    out[key] = value;
  }
  return out;
}

/**
 * @param {string} initData сырая строка от Telegram.WebApp.initData
 * @param {string} botToken токен бота (никогда не попадает на клиент)
 * @param {{maxAgeSec?: number, now?: number}} [options]
 * @returns {{verified: boolean, reason: string, userId: string|null, user: Object|null, authDate: number}}
 */
export function verifyTelegramInitData(initData, botToken, options = {}) {
  const maxAgeSec = options.maxAgeSec !== undefined ? options.maxAgeSec : DEFAULT_MAX_AGE_SEC;
  const now = options.now !== undefined ? options.now : Math.floor(Date.now() / 1000);

  const fail = (reason) => ({ verified: false, reason, userId: null, user: null, authDate: 0 });

  if (!botToken) return fail('no_bot_token');
  if (!initData) return fail('no_init_data');

  const params = parseInitData(initData);
  if (!params.hash) return fail('no_hash');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(buildDataCheckString(params))
    .digest('hex');

  // Сравнение постоянного времени: обычное === утекает позицию первого различия.
  const given = Buffer.from(String(params.hash), 'utf8');
  const mine = Buffer.from(expected, 'utf8');
  if (given.length !== mine.length || !crypto.timingSafeEqual(given, mine)) {
    return fail('bad_hash');
  }

  const authDate = Number(params.auth_date) || 0;
  // Протухшая initData — это перехваченная ссылка, а не живой игрок.
  if (maxAgeSec > 0 && (!authDate || now - authDate > maxAgeSec)) {
    return { verified: false, reason: 'expired', userId: null, user: null, authDate };
  }

  let user = null;
  try {
    user = params.user ? JSON.parse(params.user) : null;
  } catch (e) {
    user = null;
  }
  if (!user || !user.id) {
    return { verified: false, reason: 'no_user', userId: null, user: null, authDate };
  }

  return { verified: true, reason: 'ok', userId: String(user.id), user, authDate };
}

export default verifyTelegramInitData;
