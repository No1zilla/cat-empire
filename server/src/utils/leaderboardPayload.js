/**
 * Сборка ответа таблицы лидеров (TASK-125).
 *
 * Вынесено из роута, потому что роут тянет `pg` — а эта логика чистая и должна
 * проверяться тестами без базы.
 */

function mapRow(r) {
  return {
    id: r.id,
    // Историческое имя поля. Внутри — ключ игрока: у VK голый id, у Telegram `tg:<id>`.
    vkId: String(r.vk_id),
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    avatar: r.avatar || '',
    maxCatLevel: Number(r.max_cat_level) || 1,
    coins: parseFloat(r.coins) || 0,
    rank: Number(r.rank) || 0
  };
}

/**
 * Кто из строк — сам игрок, решает сервер: только он знает формат ключа.
 * Клиент раньше сравнивал `vkId` со своим id, и для Telegram это не совпадало
 * никогда — `tg:4242` против `4242`.
 */
export function buildLeaderboardPayload(rows, meKey) {
  const key = String(meKey || '');
  const mapped = (rows || []).map(mapRow).map((row) => ({
    ...row,
    isMe: Boolean(key) && row.vkId === key
  }));

  return {
    leaderboard: mapped.filter((row) => row.rank > 0 && row.rank <= 10),
    me: mapped.find((row) => row.isMe) || null
  };
}

export default buildLeaderboardPayload;
