/**
 * Константы Telegram (TASK-115).
 *
 * Имя бота не секрет — оно видно в любой ссылке на игру. Секреты (токен бота,
 * секрет вебхука) живут только в окружении сервера и в репозиторий не попадают.
 */

export const TG_BOT_USERNAME = 'catoempirebot';

/** Mini App живёт на GitHub Pages: с Bot API 10.2 у приложения должен быть один origin. */
export const TG_MINI_APP_URL = 'https://no1zilla.github.io/cat-empire/tg/';

/** Префикс реферального параметра. `startapp` приходит в initData как start_param. */
export const TG_REF_PREFIX = 'ref_';

/**
 * Ссылка-приглашение. `?startapp=` открывает главный Mini App бота и передаёт
 * параметр внутрь — это и есть весь реферальный механизм Telegram.
 */
export function telegramInviteLink(inviterId) {
  const id = String(inviterId || '').replace(/[^0-9]/g, '');
  const base = `https://t.me/${TG_BOT_USERNAME}`;
  return id ? `${base}?startapp=${TG_REF_PREFIX}${id}` : base;
}

/**
 * Разбор `start_param`. Возвращает id пригласившего или '' — параметр приходит от
 * клиента, поэтому доверять ему нельзя: сервер всё равно проверяет, что это не
 * приглашение самого себя и что игрока ещё никто не приводил.
 */
export function parseReferralParam(startParam) {
  const raw = String(startParam || '');
  if (!raw.startsWith(TG_REF_PREFIX)) return '';
  const id = raw.slice(TG_REF_PREFIX.length).replace(/[^0-9]/g, '');
  return id;
}

export default { TG_BOT_USERNAME, TG_MINI_APP_URL, telegramInviteLink, parseReferralParam };
