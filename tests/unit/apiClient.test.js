import assert from 'node:assert';
import {
  sanitizeVkSignHeader,
  vkUserIdFromLaunch,
  isLeaderboardPayload,
  leaderboardRequestUrls,
  RAILWAY_API,
  fetchLeaderboard
} from '../../src/api/client.js';

export async function runApiClientTests() {
  console.log('🧪 Тестирование API клиента (топ двора)...');

  assert.strictEqual(
    sanitizeVkSignHeader('?#vk_user_id=816275327#sign=abc'),
    'vk_user_id=816275327&sign=abc'
  );
  assert.ok(
    !sanitizeVkSignHeader('vk_user_id=1&note=Антон\nIutin').includes('\n'),
    'Перенос строки нельзя класть в HTTP-заголовок'
  );
  assert.ok(
    !/[^\x20-\x7E]/.test(sanitizeVkSignHeader('vk_user_id=1&name=Антон')),
    'Кириллица в x-vk-sign ломает fetch в WebView'
  );
  assert.strictEqual(vkUserIdFromLaunch('foo&vk_user_id=816275327&bar=1'), '816275327');
  assert.strictEqual(isLeaderboardPayload(null), false);
  assert.strictEqual(isLeaderboardPayload({ error: 'x' }), false);
  assert.strictEqual(isLeaderboardPayload({ leaderboard: [] }), true);

  const urls = leaderboardRequestUrls('/api', '816275327');
  assert.deepStrictEqual(urls, [
    '/api/leaderboard?vk_user_id=816275327',
    `${RAILWAY_API}/leaderboard?vk_user_id=816275327`
  ]);

  const origFetch = global.fetch;
  const origWindow = global.window;
  const calls = [];
  global.window = {
    location: { origin: 'http://127.0.0.1:5173', search: '', hash: '' }
  };
  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers || {} });
    if (String(url).startsWith('/api/')) {
      return { ok: false, status: 404, json: async () => ({ ok: false }) };
    }
    return {
      ok: true,
      json: async () => ({
        leaderboard: [{ vkId: '1', firstName: 'Аня', maxCatLevel: 9, rank: 1 }],
        me: null
      })
    };
  };

  try {
    const data = await fetchLeaderboard();
    assert.ok(isLeaderboardPayload(data));
    assert.strictEqual(data.leaderboard.length, 1);
    assert.ok(calls.length >= 2, 'Сначала свой /api, потом Railway');
    assert.ok(calls.every((c) => !c.headers['Content-Type'] && !c.headers['x-vk-sign']),
      'GET топа без Content-Type и без x-vk-sign — иначе VK WebView ломает CORS preflight');
    assert.ok(calls.some((c) => c.url.includes('cat-empire-production.up.railway.app/api/leaderboard')));
  } finally {
    global.fetch = origFetch;
    if (origWindow === undefined) delete global.window;
    else global.window = origWindow;
  }

  console.log('  ✅ API клиент топа двора прошёл авто-тесты!');
}
