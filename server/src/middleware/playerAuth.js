/**
 * Единая идентификация игрока: VK или Telegram (TASK-113).
 *
 * До этого сервер знал только про VK: `vk_user_id` был и ключом пользователя, и
 * всей авторизацией. Для Telegram это не подходит — там подпись другая (HMAC по
 * initData), а идентификатор живёт в своём пространстве: `vk:12345` и `tg:12345`
 * могут быть разными людьми, и склеивать их в одну колонку нельзя.
 *
 * Middleware кладёт в `req.player`:
 *   { platform: 'vk' | 'telegram', externalId: string, verified: boolean, reason: string }
 *
 * Как и `vkAuth`, сам по себе НЕ отклоняет: публичные чтения (таблица лидеров)
 * должны работать и для непроверенного гостя. Отклоняет `requirePlayer` — его
 * вешаем туда, где чужой идентификатор означает кражу прогресса или денег.
 */
import { verifyLaunchParams, GUEST_VK_ID } from './vkAuth.js';
import { verifyTelegramInitData } from '../utils/telegramCheckSign.js';

export function telegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

/** Есть ли чем проверять Telegram-подпись. */
export function isTelegramAuthEnforced() {
  return Boolean(telegramBotToken());
}

/**
 * initData ищем там, куда её кладут клиенты: свой заголовок или стандартный
 * `Authorization: tma <initData>` из документации Telegram.
 */
export function extractInitData(req) {
  const headers = (req && req.headers) || {};
  const direct = String(headers['x-telegram-init-data'] || headers['x-tg-init-data'] || '').trim();
  if (direct) return direct;

  const auth = String(headers['authorization'] || '').trim();
  if (auth.toLowerCase().startsWith('tma ')) return auth.slice(4).trim();

  return '';
}

export function identifyPlayer(req) {
  const initData = extractInitData(req);

  if (initData) {
    const tg = verifyTelegramInitData(initData, telegramBotToken());
    return {
      platform: 'telegram',
      externalId: tg.userId || '',
      verified: tg.verified,
      reason: tg.reason
    };
  }

  const vk = verifyLaunchParams(req);
  return {
    platform: 'vk',
    externalId: vk.vkUserId || '',
    verified: vk.verified,
    reason: vk.reason
  };
}

export function playerAuth(req, res, next) {
  const player = identifyPlayer(req);

  // Непроверенный игрок всё равно получает идентификатор — но помеченный.
  if (!player.externalId) {
    player.externalId = player.platform === 'vk' ? GUEST_VK_ID : '';
  }

  req.player = player;
  next();
}

let warnedNoTelegramToken = false;

/**
 * Гард для эндпоинтов, где подмена игрока = кража. Ведёт себя как `requireVkSign`:
 * если проверять нечем (нет секрета платформы), не роняет прод, но громко пишет
 * об этом в лог — молчаливо открытая дверь хуже закрытой с предупреждением.
 */
export function requirePlayer(req, res, next) {
  const player = req.player || identifyPlayer(req);
  if (player.verified) return next();

  if (player.platform === 'telegram' && player.reason === 'no_bot_token') {
    if (!warnedNoTelegramToken) {
      warnedNoTelegramToken = true;
      console.warn(
        '[player-auth] TELEGRAM_BOT_TOKEN не задан — initData не проверяется, ' +
        'прогресс и покупки открыты для любого telegram id.'
      );
    }
    return next();
  }

  if (player.platform === 'vk' && player.reason === 'no_secret') {
    return next();
  }

  console.warn('[player-auth] отклонён запрос:', req.method, req.path, player.platform, player.reason);
  return res.status(401).json({ error: 'Invalid launch signature' });
}

/**
 * Строгий гард: подпись обязана быть валидной ВСЕГДА.
 *
 * `requirePlayer` намеренно не роняет прод, когда секрета платформы нет — это
 * разумно для прогресса, источник правды по которому всё равно в облаке клиента
 * (см. TASK-107). Но для денег и наград тот же размен неверен: без токена любой
 * может выписать инвойс на чужой ключ или собрать реферальную награду за чужой id.
 * Здесь «не можем проверить» обязано означать отказ, а не пропуск.
 */
export function requireVerifiedPlayer(req, res, next) {
  const player = req.player || identifyPlayer(req);
  if (player.verified) return next();

  console.warn(
    '[player-auth] отклонён запрос к защищённой ручке:',
    req.method, req.path, player.platform, player.reason
  );
  return res.status(401).json({ error: 'Invalid launch signature' });
}

export default playerAuth;
