export const RUBY_PACKS = [
  { id: 'gems_pack_10', rubies: 10, votes: 1, title: 'Старт', hint: '2 авто-слияния' },
  { id: 'gems_pack_50', rubies: 50, votes: 4, title: 'Супер', hint: 'скидка 20%' },
  { id: 'gems_pack_150', rubies: 150, votes: 10, title: 'Империя', hint: 'скидка 33%' }
];

export function getRubyPack(itemId) {
  return RUBY_PACKS.find((pack) => pack.id === itemId) || null;
}

export const INCOME_BOOSTER_MS = 30 * 60 * 1000;
export const INCOME_BOOSTER_MULTIPLIER = 2;
export const RUBY_AD_REWARD = 5;

export default {
  RUBY_PACKS,
  getRubyPack,
  INCOME_BOOSTER_MS,
  INCOME_BOOSTER_MULTIPLIER,
  RUBY_AD_REWARD
};
