/**
 * Самостоятельная регистрация вебхука Telegram (TASK-116).
 *
 * Раньше это была ручная команда: человек подставлял токен бота в скрипт и звал
 * `setWebhook`. Но токен УЖЕ есть у сервера — он лежит в его окружении. Значит
 * сервер может привязать вебхук сам, и тогда секрет вообще никуда не переезжает:
 * ни в чат, ни в историю команд, ни в чужие руки.
 *
 * Делается на старте, идемпотентно: сначала спрашиваем у Telegram текущее
 * состояние, и трогаем настройку, только если адрес отличается от нужного.
 * Иначе каждый деплой дёргал бы `setWebhook` без причины.
 *
 * Модуль без express и pg: наружу торчит одна функция, а `fetch` приходит
 * параметром, чтобы тест мог прогнать все ветки без сети.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

/** Апдейты, которые нам нужны. Чем короче список, тем меньше поверхность вебхука. */
export const ALLOWED_UPDATES = ['message', 'pre_checkout_query'];

/**
 * @returns {Promise<{status: string, url?: string, error?: string, pending?: number}>}
 *   status: skipped_no_token | skipped_no_url | already_set | updated | failed
 */
export async function ensureTelegramWebhook(config = {}, deps = {}) {
  const token = config.token || '';
  const url = config.url || '';
  const secret = config.secret || '';
  const doFetch = deps.fetch || (typeof fetch === 'function' ? fetch : null);

  if (!token) return { status: 'skipped_no_token' };
  if (!url) return { status: 'skipped_no_url' };
  if (!doFetch) return { status: 'failed', error: 'no_fetch' };

  const call = async (method, payload) => {
    try {
      const res = await doFetch(`${TELEGRAM_API}${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      return await res.json();
    } catch (e) {
      return { ok: false, description: String((e && e.message) || e) };
    }
  };

  const info = await call('getWebhookInfo', {});
  if (!info || !info.ok) {
    return { status: 'failed', error: (info && info.description) || 'getWebhookInfo failed' };
  }

  const current = (info.result && info.result.url) || '';
  const lastError = (info.result && info.result.last_error_message) || '';
  const pending = Number(info.result && info.result.pending_update_count) || 0;

  if (current === url) {
    // Адрес верный. Ошибку доставки всё равно возвращаем: именно она скажет,
    // добирается ли Telegram до нашего хостинга.
    return { status: 'already_set', url, error: lastError || undefined, pending };
  }

  const set = await call('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ALLOWED_UPDATES,
    drop_pending_updates: false
  });

  if (!set || !set.ok) {
    return { status: 'failed', url, error: (set && set.description) || 'setWebhook failed' };
  }

  return { status: 'updated', url, pending };
}

/** Кнопка меню бота ведёт в Mini App. Необязательно, поэтому отдельно и молча. */
export async function ensureMenuButton(config = {}, deps = {}) {
  const token = config.token || '';
  const miniAppUrl = config.miniAppUrl || '';
  const doFetch = deps.fetch || (typeof fetch === 'function' ? fetch : null);

  if (!token || !miniAppUrl || !doFetch) return { status: 'skipped' };

  try {
    const res = await doFetch(`${TELEGRAM_API}${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: { type: 'web_app', text: 'Играть', web_app: { url: miniAppUrl } }
      })
    });
    const data = await res.json();
    return data && data.ok ? { status: 'set' } : { status: 'failed', error: data && data.description };
  } catch (e) {
    return { status: 'failed', error: String((e && e.message) || e) };
  }
}

export default ensureTelegramWebhook;
