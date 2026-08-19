export function formatLeaderName(entry = {}) {
  const first = String(entry.firstName || entry.first_name || '').trim();
  const last = String(entry.lastName || entry.last_name || '').trim();
  const full = [first, last].filter(Boolean).join(' ').trim();
  return full || 'Игрок';
}

export function buildLeaderboardRows(data, playerStats = {}, youVk = '') {
  const named = formatLeaderName({
    firstName: playerStats.firstName,
    lastName: playerStats.lastName
  });
  const selfName = named === 'Игрок' ? 'Ты' : named;
  const selfRow = {
    name: selfName,
    maxCatLevel: playerStats.maxCatLevel || 1,
    rank: 1,
    isYou: true
  };

  if (!data || !Array.isArray(data.leaderboard)) {
    return { status: 'error', rows: [] };
  }

  const remote = Array.isArray(data.leaderboard) ? data.leaderboard : [];
  const me = data.me || null;
  const rows = remote.slice(0, 10).map((entry, index) => ({
    name: formatLeaderName(entry),
    maxCatLevel: entry.maxCatLevel || 1,
    coins: entry.coins || 0,
    rank: Number(entry.rank) || (index + 1),
    isYou: !!(youVk && String(entry.vkId) === String(youVk))
  }));

  if (me && Number(me.rank) > 10) {
    rows.push({
      name: selfName,
      maxCatLevel: me.maxCatLevel || playerStats.maxCatLevel || 1,
      rank: Number(me.rank),
      isYou: true
    });
  }

  if (rows.length === 0) {
    return { status: 'empty', rows: [selfRow] };
  }

  return { status: 'ok', rows };
}
