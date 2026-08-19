export const RUBY_PACKS = [
  { id: 'gems_pack_10', rubies: 10, votes: 1, title: 'Старт', hint: '2 авто-слияния' },
  { id: 'gems_pack_50', rubies: 50, votes: 4, title: 'Супер', hint: 'скидка 20%' },
  { id: 'gems_pack_150', rubies: 150, votes: 10, title: 'Империя', hint: 'скидка 33%' }
];

export const STARTER_PACK = {
  id: 'starter_tribute_5',
  rubies: 80,
  votes: 5,
  title: 'Ларец',
  hint: 'час ×2'
};

export const EDICT_PACK = {
  id: 'edict_seven_nights',
  rubies: 40,
  votes: 8,
  title: 'Указ',
  hint: '7 ночей ×2'
};

export function getRubyPack(itemId) {
  if (itemId === STARTER_PACK.id) return STARTER_PACK;
  if (itemId === EDICT_PACK.id) return EDICT_PACK;
  return RUBY_PACKS.find((pack) => pack.id === itemId) || null;
}

export const INCOME_BOOSTER_MS = 30 * 60 * 1000;
export const INCOME_BOOSTER_MULTIPLIER = 2;
export const RUBY_AD_REWARD = 5;

/** Ларец — разовый IAP. Ролик рядом, не вместо кассы и не вместо +5. */
export const STARTER_TRIBUTE_ACTIONS = ['votes', 'ad', 'later'];

/** Нет рубинов на «Соединить»: сначала ролик, потом казна. */
export const OUT_OF_RUBIES_ACTIONS = ['ad', 'shop', 'close'];

export default {
  RUBY_PACKS,
  getRubyPack,
  INCOME_BOOSTER_MS,
  INCOME_BOOSTER_MULTIPLIER,
  RUBY_AD_REWARD
};
