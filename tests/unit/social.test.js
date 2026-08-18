import assert from 'node:assert';
import { formatLeaderName, buildLeaderboardRows } from '../../src/ui/leaderboardRows.js';
import { VKService, wallPostMessage, isVkUserCancel } from '../../src/vk/VKBridge.js';

export async function runSocialTests() {
  console.log('🧪 Тестирование стены VK и таблицы лидеров...');

  assert.strictEqual(
    wallPostMessage('Моя империя растёт. Заходи: https://vk.com/app54702054'),
    'Моя империя растёт. Заходи:',
    'URL приложения надо убрать из текста — две ссылки VK режет'
  );
  assert.strictEqual(
    wallPostMessage('https://vk.ru/app54702054'),
    'Моя Империя Котиков растёт. Заходи поиграть.',
    'Пустой текст после вырезания ссылки заменяется фразой по умолчанию'
  );
  assert.ok(isVkUserCancel({ error_type: 'client_error', error_code: 4 }));
  assert.ok(isVkUserCancel({ error_data: { error_reason: 'User denied' } }));
  assert.strictEqual(isVkUserCancel({ error_code: 1, message: 'network' }), false);

  assert.strictEqual(formatLeaderName({ firstName: 'Иван', lastName: 'Кот' }), 'Иван Кот');
  assert.strictEqual(formatLeaderName({ first_name: 'Маша' }), 'Маша');
  assert.strictEqual(formatLeaderName({}), 'Игрок');

  const empty = buildLeaderboardRows({ leaderboard: [], me: null }, { firstName: 'Лена', maxCatLevel: 4 });
  assert.strictEqual(empty.status, 'empty');
  assert.strictEqual(empty.rows[0].name, 'Лена');
  assert.strictEqual(empty.rows[0].isYou, true);

  const failed = buildLeaderboardRows(null, { maxCatLevel: 2 });
  assert.strictEqual(failed.status, 'error');
  assert.strictEqual(failed.rows[0].name, 'Ты');

  const top = buildLeaderboardRows({
    leaderboard: [
      { vkId: '1', firstName: 'Аня', maxCatLevel: 9, rank: 1 },
      { vkId: '2', firstName: 'Боря', maxCatLevel: 8, rank: 2 }
    ],
    me: { vkId: '1', rank: 1, maxCatLevel: 9 }
  }, { firstName: 'Аня' }, '1');
  assert.strictEqual(top.status, 'ok');
  assert.strictEqual(top.rows.length, 2);
  assert.strictEqual(top.rows[0].isYou, true);
  assert.strictEqual(top.rows[1].isYou, false);

  const outside = buildLeaderboardRows({
    leaderboard: [{ vkId: '9', firstName: 'Топ', maxCatLevel: 12, rank: 1 }],
    me: { vkId: '42', rank: 18, maxCatLevel: 3 }
  }, { firstName: 'Я', maxCatLevel: 3 }, '42');
  assert.strictEqual(outside.rows.length, 2);
  assert.strictEqual(outside.rows[1].rank, 18);
  assert.strictEqual(outside.rows[1].isYou, true);

  const prevWindow = global.window;
  delete global.window;
  const vk = new VKService();
  const share = await vk.sharePost('тест https://vk.com/app54702054');
  const invite = await vk.showInviteBox();
  assert.strictEqual(share.success, true);
  assert.strictEqual(share.simulated, true);
  assert.strictEqual(invite.simulated, true);
  assert.strictEqual(invite.success, false);
  if (prevWindow === undefined) delete global.window;
  else global.window = prevWindow;

  console.log('  ✅ Стена, инвайт и лидерборд прошли проверки');
}
