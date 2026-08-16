export const IDOL_REWARDS = [
  { id: 'handful', weight: 50, rubies: 3, label: 'Пригоршня' },
  { id: 'heart', weight: 25, rubies: 8, label: 'Сердце' },
  { id: 'dash', weight: 20, boosterMs: 10 * 60 * 1000, label: 'Рывок' },
  { id: 'mint_dream', weight: 5, mint: 1, rubiesFallback: 5, label: 'Мята сна' }
];

export function rollIdolReward(rng = Math.random, mint = 0) {
  const total = IDOL_REWARDS.reduce((sum, row) => sum + row.weight, 0);
  let ticket = rng() * total;
  let picked = IDOL_REWARDS[0];
  for (const row of IDOL_REWARDS) {
    ticket -= row.weight;
    if (ticket <= 0) {
      picked = row;
      break;
    }
  }
  if (picked.id === 'mint_dream' && Number(mint) <= 0) {
    return { id: 'mint_dream', rubies: picked.rubiesFallback, label: picked.label, mint: 0 };
  }
  return { ...picked };
}

export default { IDOL_REWARDS, rollIdolReward };
