import { verifyVkSign } from '../utils/vkCheckSign.js';

/**
 * Авторизация VK Mini Apps.
 *
 * Раньше здесь только вытаскивался vk_user_id регуляркой, а подпись не
 * проверялась вообще — любой мог прислать чужой vk_user_id и переписать
 * чужой прогресс. Теперь параметры запуска реально валидируются HMAC-ом
 * (`verifyVkSign`), а результат кладётся в `req.vkVerified`.
 *
 * Сам `vkAuth` намеренно НЕ отклоняет запрос: id по-прежнему извлекается,
 * чтобы публичные чтения (лидерборд) продолжали работать. Отклоняет
 * `requireVkSign` — его вешаем на запись и на чтение чужих данных.
 */

export const GUEST_VK_ID = '999999999';

export function vkAppSecret() {
  return process.env.VK_APP_SECRET || process.env.VK_SECRET || '';
}

/** Есть ли у сервера чем проверять подпись. */
export function isSignatureEnforced() {
  return Boolean(vkAppSecret());
}

function normalizeQuery(raw) {
  return String(raw || '')
    .replace(/^[?#/]+/, '')
    .replace(/#/g, '&')
    .trim();
}

/**
 * Кандидаты на строку параметров запуска: заголовок от клиента и query самого URL.
 * Проверяем их по отдельности — склеивать нельзя, подпись считается по одному набору.
 */
function candidateQueries(req) {
  const out = [];
  const header = String(req.headers['x-vk-sign'] || req.headers['authorization'] || '').trim();
  if (header) out.push(header);
  const url = String(req.originalUrl || req.url || '');
  const q = url.indexOf('?');
  if (q !== -1) out.push(url.slice(q + 1));
  return out;
}

function extractAnyVkUserId(req) {
  for (const raw of candidateQueries(req)) {
    const match = normalizeQuery(raw).match(/vk_user_id=([0-9]+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * @returns {{verified: boolean, vkUserId: string|null, reason: string}}
 */
export function verifyLaunchParams(req, secret = vkAppSecret()) {
  if (!secret) return { verified: false, vkUserId: null, reason: 'no_secret' };

  for (const raw of candidateQueries(req)) {
    const query = normalizeQuery(raw);
    if (!query || !query.includes('sign=')) continue;
    if (!verifyVkSign(query, secret)) continue;
    const match = query.match(/vk_user_id=([0-9]+)/);
    if (match) return { verified: true, vkUserId: match[1], reason: 'ok' };
  }

  return { verified: false, vkUserId: null, reason: 'bad_sign' };
}

export function vkAuth(req, res, next) {
  const result = verifyLaunchParams(req);

  // Доверяем id из подписанных параметров; иначе — извлекаем как раньше,
  // но помечаем запрос как непроверенный.
  const rawId = result.vkUserId || extractAnyVkUserId(req) || GUEST_VK_ID;

  req.vkVerified = result.verified;
  req.vkAuthReason = result.reason;

  try {
    req.vkUserId = BigInt(rawId);
  } catch (error) {
    req.vkUserId = BigInt(GUEST_VK_ID);
  }

  next();
}

let warnedNoSecret = false;

/**
 * Гард для эндпоинтов, где чужой vk_user_id — это уже уязвимость (запись прогресса,
 * чтение своего профиля). Без VK_APP_SECRET проверять нечем: не роняем прод,
 * но громко пишем в лог и отдаём статус в /api/health.
 */
export function requireVkSign(req, res, next) {
  if (req.vkVerified) return next();

  if (!isSignatureEnforced()) {
    if (!warnedNoSecret) {
      warnedNoSecret = true;
      console.warn(
        '[vk-auth] VK_APP_SECRET не задан — подпись не проверяется, ' +
        'запись прогресса открыта для любого vk_user_id. Задай переменную в окружении Railway.'
      );
    }
    return next();
  }

  console.warn('[vk-auth] отклонён запрос без валидной подписи:', req.method, req.path, req.vkAuthReason);
  return res.status(401).json({ error: 'Invalid VK signature' });
}

export default vkAuth;
