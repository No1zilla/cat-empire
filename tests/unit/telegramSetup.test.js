import assert from 'node:assert';
import { ensureTelegramWebhook, ensureMenuButton, ALLOWED_UPDATES } from '../../server/src/services/telegramSetup.js';

/** Заглушка Telegram API: помнит вызовы и отвечает заранее заданным. */
function fakeTelegram(responses = {}) {
  const calls = [];
  const fetchFn = async (url, options) => {
    const method = String(url).split('/').pop();
    const body = JSON.parse(options.body || '{}');
    calls.push({ method, body });
    const answer = responses[method] || { ok: true, result: true };
    return { json: async () => answer };
  };
  return { calls, fetchFn };
}

const TOKEN = '123:TEST';
const URL = 'https://example.test/api/telegram/webhook';

export async function runTelegramSetupTests() {
  console.log('🧪 Тестирование самопривязки вебхука Telegram...');

  // --- Без токена или адреса ничего не трогаем ---
  assert.strictEqual((await ensureTelegramWebhook({ url: URL })).status, 'skipped_no_token');
  assert.strictEqual((await ensureTelegramWebhook({ token: TOKEN })).status, 'skipped_no_url');

  // --- Адрес уже верный: setWebhook не зовём ---
  const same = fakeTelegram({
    getWebhookInfo: { ok: true, result: { url: URL, pending_update_count: 0 } }
  });
  const alreadySet = await ensureTelegramWebhook(
    { token: TOKEN, url: URL, secret: 's' },
    { fetch: same.fetchFn }
  );
  assert.strictEqual(alreadySet.status, 'already_set');
  assert.deepStrictEqual(
    same.calls.map((c) => c.method),
    ['getWebhookInfo'],
    'Ничего не меняем, если адрес уже тот — иначе каждый деплой дёргал бы Telegram зря'
  );

  // --- Адрес другой: привязываем, с секретом и коротким списком апдейтов ---
  const stale = fakeTelegram({
    getWebhookInfo: { ok: true, result: { url: 'https://старый.example/hook' } },
    setWebhook: { ok: true, result: true }
  });
  const updated = await ensureTelegramWebhook(
    { token: TOKEN, url: URL, secret: 'секрет' },
    { fetch: stale.fetchFn }
  );
  assert.strictEqual(updated.status, 'updated');
  const setCall = stale.calls.find((c) => c.method === 'setWebhook');
  assert.strictEqual(setCall.body.url, URL);
  assert.strictEqual(setCall.body.secret_token, 'секрет', 'Вебхук обязан быть закрыт секретом');
  assert.deepStrictEqual(setCall.body.allowed_updates, ALLOWED_UPDATES);
  assert.strictEqual(setCall.body.drop_pending_updates, false, 'Ожидающие платежи не выбрасываем');

  // --- Ошибка доставки возвращается наверх: это ответ на вопрос «доходит ли Telegram до хостинга» ---
  const failing = fakeTelegram({
    getWebhookInfo: {
      ok: true,
      result: { url: URL, last_error_message: 'Connection timed out', pending_update_count: 7 }
    }
  });
  const withError = await ensureTelegramWebhook({ token: TOKEN, url: URL }, { fetch: failing.fetchFn });
  assert.strictEqual(withError.status, 'already_set');
  assert.strictEqual(withError.error, 'Connection timed out');
  assert.strictEqual(withError.pending, 7, 'Накопившиеся апдейты — признак недоступного бэкенда');

  // --- Telegram отказал ---
  const rejected = fakeTelegram({
    getWebhookInfo: { ok: true, result: { url: '' } },
    setWebhook: { ok: false, description: 'Bad webhook: HTTPS url must be provided' }
  });
  const failed = await ensureTelegramWebhook({ token: TOKEN, url: URL }, { fetch: rejected.fetchFn });
  assert.strictEqual(failed.status, 'failed');
  assert.match(failed.error, /HTTPS/);

  // --- Сеть упала: не роняем старт сервера ---
  const broken = { fetch: async () => { throw new Error('ECONNREFUSED'); } };
  const netDown = await ensureTelegramWebhook({ token: TOKEN, url: URL }, broken);
  assert.strictEqual(netDown.status, 'failed');

  // --- Кнопка меню ---
  const menu = fakeTelegram({ setChatMenuButton: { ok: true, result: true } });
  const menuRes = await ensureMenuButton(
    { token: TOKEN, miniAppUrl: 'https://example.test/tg/' },
    { fetch: menu.fetchFn }
  );
  assert.strictEqual(menuRes.status, 'set');
  assert.strictEqual(menu.calls[0].body.menu_button.web_app.url, 'https://example.test/tg/');
  assert.strictEqual((await ensureMenuButton({ token: TOKEN })).status, 'skipped');

  console.log('  ✅ Сервер привязывает вебхук сам, идемпотентно, и показывает ошибку доставки');
}
