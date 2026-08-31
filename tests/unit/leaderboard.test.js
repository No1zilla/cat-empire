import assert from 'node:assert';
import { buildLeaderboardPayload } from '../../server/src/utils/leaderboardPayload.js';
import { buildLeaderboardRows } from '../../src/ui/leaderboardRows.js';
import playerKey from '../../server/src/utils/playerKey.js';

function row(vkId, rank, extra = {}) {
  return {
    id: `id_${vkId}`,
    vk_id: vkId,
    first_name: 'Игрок',
    last_name: '',
    avatar: '',
    max_cat_level: 5,
    coins: 100,
    rank,
    ...extra
  };
}

export function runLeaderboardTests() {
  console.log('🧪 Тестирование таблицы лидеров (VK + Telegram)...');

  // Ключи двух платформ живут в одной колонке и не должны путаться.
  assert.strictEqual(playerKey({ platform: 'vk', externalId: '4242' }), '4242');
  assert.strictEqual(playerKey({ platform: 'telegram', externalId: '4242' }), 'tg:4242');

  const rows = [
    row('816275327', 1),
    row('tg:4242', 2),
    row('555', 11)
  ];

  // --- VK-игрок находит себя, как и раньше ---
  const vkPayload = buildLeaderboardPayload(rows, '816275327');
  assert.strictEqual(vkPayload.me && vkPayload.me.vkId, '816275327', 'VK-игрок должен находить себя');
  assert.strictEqual(vkPayload.leaderboard[0].isMe, true, 'своя строка помечена isMe');
  assert.strictEqual(vkPayload.leaderboard[1].isMe, false, 'чужая строка не помечена');

  // --- Игрок из Telegram: до TASK-125 здесь всегда был null ---
  const tgPayload = buildLeaderboardPayload(rows, 'tg:4242');
  assert.strictEqual(tgPayload.me && tgPayload.me.vkId, 'tg:4242', 'игрок из Telegram должен находить себя');
  assert.strictEqual(tgPayload.me.rank, 2, 'ранг игрока из Telegram');

  // Одинаковый числовой id на разных платформах — разные люди.
  const collision = buildLeaderboardPayload([row('4242', 1), row('tg:4242', 2)], 'tg:4242');
  assert.strictEqual(collision.me.vkId, 'tg:4242', 'tg:4242 не должен схлопываться с 4242');
  assert.strictEqual(collision.leaderboard[0].isMe, false, 'VK-однофамилец не помечается своим');

  // --- Гость не считается своим ---
  const guest = buildLeaderboardPayload(rows, '');
  assert.strictEqual(guest.me, null, 'без ключа своей строки нет');
  assert.ok(guest.leaderboard.every((r) => r.isMe === false), 'гостю ничего не помечаем');

  // --- Игрок ниже десятого места приезжает отдельной строкой ---
  const deep = buildLeaderboardPayload(rows, '555');
  assert.strictEqual(deep.me.rank, 11, 'одиннадцатый получает свою строку');
  assert.strictEqual(deep.leaderboard.length, 2, 'в топ он при этом не попадает');

  // --- Клиент доверяет серверной пометке, а не сравнению id ---
  const built = buildLeaderboardRows(tgPayload, { maxCatLevel: 5 }, '');
  const mine = built.rows.filter((r) => r.isYou);
  assert.strictEqual(mine.length, 1, 'ровно одна строка отмечена как своя');
  assert.strictEqual(mine[0].rank, 2, 'и это вторая строка');

  console.log('  ✅ Игрок из Telegram видит себя, ключи платформ не схлопываются');
}
