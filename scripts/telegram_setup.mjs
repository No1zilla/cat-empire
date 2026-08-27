#!/usr/bin/env node
/**
 * Разовая настройка бота Telegram (TASK-114).
 *
 * Запускать после того, как @BotFather выдал токен:
 *
 *   TELEGRAM_BOT_TOKEN=123:ABC \
 *   TELEGRAM_WEBHOOK_SECRET=любая-длинная-строка \
 *   WEBHOOK_URL=https://<бэкенд>/api/telegram/webhook \
 *   MINI_APP_URL=https://no1zilla.github.io/cat-empire/tg/ \
 *   node scripts/telegram_setup.mjs
 *
 * Что делает:
 *   1. вешает вебхук с секретным заголовком и подпиской только на нужные апдейты;
 *   2. ставит кнопку меню бота на Mini App;
 *   3. печатает getWebhookInfo, чтобы сразу увидеть отказы Telegram.
 *
 * Секреты берутся ТОЛЬКО из окружения и никуда не пишутся: токен бота — это
 * право выписывать счета от твоего имени, ему нечего делать в репозитории.
 *
 * Скрипт идемпотентен: повторный запуск просто перезапишет те же настройки.
 */

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const webhookUrl = process.env.WEBHOOK_URL || '';
const miniAppUrl = process.env.MINI_APP_URL || '';

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!token) fail('Не задан TELEGRAM_BOT_TOKEN');
if (!webhookUrl) fail('Не задан WEBHOOK_URL (адрес /api/telegram/webhook на бэкенде)');
if (!secret) fail('Не задан TELEGRAM_WEBHOOK_SECRET — без него сервер отвергает вебхук, и это правильно');
if (!/^https:\/\//.test(webhookUrl)) fail('WEBHOOK_URL должен быть https — Telegram другие не принимает');

async function api(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`  ↳ ${method}: ${data.description || 'отказ без описания'}`);
  }
  return data;
}

const me = await api('getMe', {});
if (!me.ok) fail('Токен не принят Telegram. Проверь TELEGRAM_BOT_TOKEN');
console.log(`🤖 Бот: @${me.result.username} (${me.result.first_name})`);

// allowed_updates сознательно короткий: чем меньше типов апдейтов, тем меньше
// поверхность у вебхука. Платежи — это pre_checkout_query и message.
const hook = await api('setWebhook', {
  url: webhookUrl,
  secret_token: secret,
  allowed_updates: ['message', 'pre_checkout_query'],
  drop_pending_updates: false
});
console.log(hook.ok ? `✅ Вебхук: ${webhookUrl}` : '❌ Вебхук не установлен');

if (miniAppUrl) {
  if (!/^https:\/\//.test(miniAppUrl)) fail('MINI_APP_URL должен быть https');
  const menu = await api('setChatMenuButton', {
    menu_button: { type: 'web_app', text: 'Играть', web_app: { url: miniAppUrl } }
  });
  console.log(menu.ok ? `✅ Кнопка меню ведёт на ${miniAppUrl}` : '❌ Кнопка меню не установлена');
  console.log('ℹ️  Сам Mini App (адрес приложения и защиту домена) задаёт @BotFather — API это не умеет.');
}

const info = await api('getWebhookInfo', {});
if (info.ok) {
  const r = info.result || {};
  console.log('\n📡 Состояние вебхука:');
  console.log(`   url: ${r.url || '(пусто)'}`);
  console.log(`   ожидают доставки: ${r.pending_update_count || 0}`);
  if (r.last_error_message) {
    console.log(`   ⚠️ последняя ошибка: ${r.last_error_message} (${new Date((r.last_error_date || 0) * 1000).toISOString()})`);
    console.log('   Частая причина — бэкенд недоступен снаружи или отвечает не 200.');
  } else {
    console.log('   ошибок доставки нет');
  }
}
