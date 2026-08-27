import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  vkAuth,
  requireVkSign,
  verifyLaunchParams,
  isSignatureEnforced,
  GUEST_VK_ID
} from '../../server/src/middleware/vkAuth.js';

const SECRET = 'test_secret_value';

/** Независимая реализация подписи VK — чтобы тест не повторял код, который проверяет. */
function signLaunchParams(params, secret) {
  const query = Object.keys(params)
    .filter((key) => key.startsWith('vk_'))
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
  return crypto
    .createHmac('sha256', secret)
    .update(query)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function launchQuery(params, secret) {
  const sign = signLaunchParams(params, secret);
  const body = Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
  return `${body}&sign=${sign}`;
}

function makeReq(header, url = '/api/user/save') {
  return {
    method: 'POST',
    path: '/save',
    originalUrl: url,
    url,
    headers: header ? { 'x-vk-sign': header } : {}
  };
}

function runGuard(req) {
  const captured = { status: null, body: null, nextCalled: false };
  const res = {
    status(code) {
      captured.status = code;
      return {
        json(payload) {
          captured.body = payload;
          return payload;
        }
      };
    }
  };
  requireVkSign(req, res, () => {
    captured.nextCalled = true;
  });
  return captured;
}

export function runVkAuthTests() {
  console.log('🧪 Тестирование проверки подписи VK (server/src/middleware/vkAuth.js)...');

  const previousSecret = process.env.VK_APP_SECRET;
  const previousAlt = process.env.VK_SECRET;
  delete process.env.VK_SECRET;

  const params = {
    vk_user_id: '816275327',
    vk_app_id: '54702054',
    vk_ts: '1756200000',
    vk_platform: 'desktop_web'
  };

  // --- 1. Валидная подпись принимается, id берётся из подписанных параметров ---
  process.env.VK_APP_SECRET = SECRET;
  const validReq = makeReq(launchQuery(params, SECRET));
  vkAuth(validReq, {}, () => {});
  assert.strictEqual(validReq.vkVerified, true, 'валидная подпись должна проходить проверку');
  assert.strictEqual(validReq.vkUserId, 816275327n, 'id должен браться из подписанных параметров');
  assert.strictEqual(runGuard(validReq).nextCalled, true, 'гард должен пропускать подписанный запрос');

  // --- 2. Подменённый vk_user_id ломает подпись и отклоняется ---
  const tampered = launchQuery(params, SECRET).replace('vk_user_id=816275327', 'vk_user_id=111');
  const tamperedReq = makeReq(tampered);
  vkAuth(tamperedReq, {}, () => {});
  assert.strictEqual(tamperedReq.vkVerified, false, 'подменённый id не должен считаться проверенным');
  const tamperedGuard = runGuard(tamperedReq);
  assert.strictEqual(tamperedGuard.nextCalled, false, 'гард не должен пропускать подменённый id');
  assert.strictEqual(tamperedGuard.status, 401, 'подменённый id должен получать 401');

  // --- 3. Чужой секрет не подходит ---
  const foreignReq = makeReq(launchQuery(params, 'someone_elses_secret'));
  vkAuth(foreignReq, {}, () => {});
  assert.strictEqual(foreignReq.vkVerified, false, 'подпись чужим секретом не должна проходить');
  assert.strictEqual(runGuard(foreignReq).status, 401, 'чужой секрет должен получать 401');

  // --- 4. Совсем без подписи (старый вектор атаки) ---
  const unsignedReq = makeReq('vk_user_id=816275327');
  vkAuth(unsignedReq, {}, () => {});
  assert.strictEqual(unsignedReq.vkVerified, false, 'голый vk_user_id не должен считаться проверенным');
  assert.strictEqual(runGuard(unsignedReq).status, 401, 'запрос без подписи должен получать 401');

  // --- 5. Без параметров вообще — гостевой id, но не доступ ---
  const emptyReq = makeReq('');
  vkAuth(emptyReq, {}, () => {});
  assert.strictEqual(emptyReq.vkUserId, BigInt(GUEST_VK_ID), 'без параметров ожидается гостевой id');
  assert.strictEqual(emptyReq.vkVerified, false, 'гость не проверен');

  // --- 6. Нет секрета — проверять нечем: не роняем прод, но и не врём про статус ---
  delete process.env.VK_APP_SECRET;
  assert.strictEqual(isSignatureEnforced(), false, 'без секрета проверка не может быть включена');
  const noSecretReq = makeReq(launchQuery(params, SECRET));
  vkAuth(noSecretReq, {}, () => {});
  assert.strictEqual(noSecretReq.vkAuthReason, 'no_secret', 'причина должна отличать «нет секрета» от «плохая подпись»');
  assert.strictEqual(runGuard(noSecretReq).nextCalled, true, 'без секрета гард не должен ломать прод');

  // --- 7. Подпись может приехать в query, а не только в заголовке ---
  process.env.VK_APP_SECRET = SECRET;
  const queryReq = makeReq('', `/api/user/save?${launchQuery(params, SECRET)}`);
  vkAuth(queryReq, {}, () => {});
  assert.strictEqual(queryReq.vkVerified, true, 'подпись из query тоже должна проверяться');
  assert.strictEqual(verifyLaunchParams(queryReq, SECRET).vkUserId, '816275327', 'id из query-подписи');

  if (previousSecret === undefined) delete process.env.VK_APP_SECRET;
  else process.env.VK_APP_SECRET = previousSecret;
  if (previousAlt !== undefined) process.env.VK_SECRET = previousAlt;

  console.log('  ✅ Подпись VK проверяется, подмена vk_user_id отклоняется!');
}
