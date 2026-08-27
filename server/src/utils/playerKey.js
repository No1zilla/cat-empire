/**
 * Ключ игрока в базе (TASK-113).
 *
 * `users.vk_id` исторически хранит идентификатор ВКонтакте и используется как
 * ключ во всех запросах, включая аналитику и таблицу лидеров. Telegram даёт свои
 * идентификаторы в собственном пространстве: `4242` в VK и `4242` в Telegram —
 * разные люди, и просто дописать их в ту же колонку нельзя.
 *
 * Здесь выбран префикс вместо составного ключа `(platform, external_id)`. Причина
 * прагматичная: составной ключ означает переписать схему и каждый запрос в проде,
 * где на этой неделе уже терялся прогресс. Префикс не трогает ни одной живой
 * строки — VK-идентификаторы остаются как были, а Telegram приходит как `tg:4242`.
 *
 * Колонка `platform` заводится отдельно и только ради отчётов: разрезать метрики
 * по платформам через `LIKE 'tg:%'` было бы издевательством над будущим собой.
 */

/** Приставки платформ. У VK её нет — иначе пришлось бы мигрировать живые строки. */
export const PLATFORM_PREFIX = {
  vk: '',
  telegram: 'tg:'
};

/**
 * @param {{platform?: string, externalId?: string|number}} player
 * @returns {string} ключ для колонки users.vk_id
 */
export function playerKey(player = {}) {
  const platform = String(player.platform || 'vk').toLowerCase();
  const id = String(player.externalId || '').trim();
  if (!id) return '';
  const prefix = PLATFORM_PREFIX[platform] !== undefined ? PLATFORM_PREFIX[platform] : `${platform}:`;
  return `${prefix}${id}`;
}

/** Обратный разбор: из ключа обратно в платформу и идентификатор. */
export function parsePlayerKey(key) {
  const raw = String(key || '');
  const sep = raw.indexOf(':');
  if (sep === -1) return { platform: 'vk', externalId: raw };
  return { platform: raw.slice(0, sep) === 'tg' ? 'telegram' : raw.slice(0, sep), externalId: raw.slice(sep + 1) };
}

export default playerKey;
