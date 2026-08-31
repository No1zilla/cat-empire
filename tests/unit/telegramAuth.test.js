import assert from 'node:assert';
import crypto from 'node:crypto';
import { verifyTelegramInitData, parseInitData } from '../../server/src/utils/telegramCheckSign.js';
import { identifyPlayer, requirePlayer, requireVerifiedPlayer, extractInitData } from '../../server/src/middleware/playerAuth.js';

const BOT_TOKEN = '123456:TEST-BOT-TOKEN';

/**
 * Независимая сборка подписи — тест не должен повторять код, который проверяет,
 * иначе одинаковая ошибка в обоих местах пройдёт незамеченной.
 */
function buildInitData(fields, botToken = BOT_TOKEN) {
  const pairs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`);
  const dataCheckString = pairs.join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  const query = Object.keys(fields)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(fields[k])}`)
    .join('&');
  return `${query}&hash=${hash}`;
}

function freshFields(overrides = {}) {
  return {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAEtest',
    user: JSON.stringify({ id: 4242, first_name: 'Аня', username: 'anya' }),
    ...overrides
  };
}

function makeReq(headers = {}) {
  return { method: 'POST', path: '/save', originalUrl: '/api/user/save', url: '/api/user/save', headers };
}

function runGuard(req) {
  const captured = { status: null, nextCalled: false };
  const res = {
    status(code) {
      captured.status = code;
      return { json: (p) => p };
    }
  };
  requirePlayer(req, res, () => { captured.nextCalled = true; });
  return captured;
}

/** Строгий гард денежных ручек: /stars/invoice, /referral/claim. */
function runStrictGuard(req) {
  const captured = { status: null, nextCalled: false };
  const res = {
    status(code) {
      captured.status = code;
      return { json: (p) => p };
    }
  };
  requireVerifiedPlayer(req, res, () => { captured.nextCalled = true; });
  return captured;
}

export function runTelegramAuthTests() {
  console.log('🧪 Тестирование подписи Telegram initData...');

  // Разбор не должен ломаться о JSON в поле user: там и `&`, и `=`.
  const parsed = parseInitData('user=%7B%22id%22%3A1%2C%22n%22%3A%22a%26b%22%7D&auth_date=100&hash=zz');
  assert.strictEqual(parsed.auth_date, '100');
  assert.deepStrictEqual(JSON.parse(parsed.user), { id: 1, n: 'a&b' });

  // --- 1. Валидная подпись ---
  const valid = verifyTelegramInitData(buildInitData(freshFields()), BOT_TOKEN);
  assert.strictEqual(valid.verified, true, 'валидная initData должна проходить');
  assert.strictEqual(valid.userId, '4242');
  assert.strictEqual(valid.user.username, 'anya');

  // --- 2. Подменённый пользователь ломает подпись ---
  const tampered = buildInitData(freshFields()).replace('4242', '9999');
  assert.strictEqual(
    verifyTelegramInitData(tampered, BOT_TOKEN).reason,
    'bad_hash',
    'подмена id должна ломать hash'
  );

  // --- 3. Чужой токен не подходит ---
  const foreign = buildInitData(freshFields(), '999:OTHER-BOT');
  assert.strictEqual(verifyTelegramInitData(foreign, BOT_TOKEN).verified, false, 'чужой бот не проходит');

  // --- 4. Протухшая initData отклоняется: перехваченная ссылка не вечна ---
  const old = buildInitData(freshFields({ auth_date: String(Math.floor(Date.now() / 1000) - 90000) }));
  assert.strictEqual(verifyTelegramInitData(old, BOT_TOKEN).reason, 'expired');
  assert.strictEqual(
    verifyTelegramInitData(old, BOT_TOKEN, { maxAgeSec: 0 }).verified,
    true,
    'проверку возраста можно отключить явно'
  );

  // --- 5. Без токена честно говорим, что проверять нечем ---
  assert.strictEqual(verifyTelegramInitData(buildInitData(freshFields()), '').reason, 'no_bot_token');

  // --- 6. Определение платформы по запросу ---
  const prevToken = process.env.TELEGRAM_BOT_TOKEN;
  const prevVk = process.env.VK_APP_SECRET;
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;

  const initData = buildInitData(freshFields());
  assert.strictEqual(extractInitData(makeReq({ 'x-telegram-init-data': initData })), initData);
  assert.strictEqual(
    extractInitData(makeReq({ authorization: `tma ${initData}` })),
    initData,
    'стандартный заголовок Authorization: tma тоже принимается'
  );

  const tgReq = makeReq({ 'x-telegram-init-data': initData });
  const tgPlayer = identifyPlayer(tgReq);
  assert.strictEqual(tgPlayer.platform, 'telegram');
  assert.strictEqual(tgPlayer.externalId, '4242');
  assert.strictEqual(tgPlayer.verified, true);

  tgReq.player = tgPlayer;
  assert.strictEqual(runGuard(tgReq).nextCalled, true, 'проверенный игрок Telegram проходит гард');

  // Подделка отклоняется, а не пропускается как гость.
  const fakeReq = makeReq({ 'x-telegram-init-data': tampered });
  fakeReq.player = identifyPlayer(fakeReq);
  assert.strictEqual(fakeReq.player.verified, false);
  assert.strictEqual(runGuard(fakeReq).status, 401, 'подделанная initData получает 401');

  // Без заголовка Telegram остаёмся на VK-ветке — старые клиенты не ломаются.
  delete process.env.VK_APP_SECRET;
  const vkReq = makeReq({ 'x-vk-sign': 'vk_user_id=816275327' });
  const vkPlayer = identifyPlayer(vkReq);
  assert.strictEqual(vkPlayer.platform, 'vk');
  assert.strictEqual(vkPlayer.verified, false);
  assert.strictEqual(vkPlayer.reason, 'no_secret');

  // --- Деньги и награды: «нечем проверить» обязано означать отказ (TASK-124) ---
  // Без токена мягкий гард пропускает — это осознанный размен для прогресса.
  delete process.env.TELEGRAM_BOT_TOKEN;
  const noTokenReq = makeReq({ 'x-telegram-init-data': buildInitData(freshFields()) });
  noTokenReq.player = identifyPlayer(noTokenReq);
  assert.strictEqual(noTokenReq.player.reason, 'no_bot_token');
  assert.strictEqual(runGuard(noTokenReq).nextCalled, true, 'прогресс без токена не роняем');
  // ...а строгий обязан отклонить: иначе инвойс и реферальная награда открыты всем.
  assert.strictEqual(runStrictGuard(noTokenReq).status, 401, 'деньги без токена — отказ');

  // То же и для VK без секрета.
  delete process.env.VK_APP_SECRET;
  const vkNoSecret = makeReq({ 'x-vk-sign': 'vk_user_id=816275327' });
  vkNoSecret.player = identifyPlayer(vkNoSecret);
  assert.strictEqual(runGuard(vkNoSecret).nextCalled, true, 'VK-прогресс без секрета не роняем');
  assert.strictEqual(runStrictGuard(vkNoSecret).status, 401, 'VK-деньги без секрета — отказ');

  if (prevToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = prevToken;
  if (prevVk === undefined) delete process.env.VK_APP_SECRET;
  else process.env.VK_APP_SECRET = prevVk;

  console.log('  ✅ initData проверяется, подмена и протухшая ссылка отклоняются');
}
