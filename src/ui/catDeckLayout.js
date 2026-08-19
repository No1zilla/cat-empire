/** Высота колоды: подписи Lvl / доход живут внутри карточки, не режутся по низу. */
export const CAT_DECK_H = 116;
export const CAT_CARD_W = 54;
export const CAT_CARD_H = 78;
export const CAT_CARD_Y = 30;
export const CAT_LVL_Y = 52;
export const CAT_INCOME_Y = 64;
export const CAT_LOCK_LVL_Y = 60;
export const CAT_LABEL_FONT = 9;

export function catDeckLabelsFit(deckH = CAT_DECK_H) {
  const labelBottom = Math.max(CAT_INCOME_Y, CAT_LOCK_LVL_Y) + CAT_LABEL_FONT + 2;
  return CAT_CARD_Y + CAT_CARD_H <= deckH - 6 && labelBottom <= CAT_CARD_H;
}

export default {
  CAT_DECK_H,
  CAT_CARD_W,
  CAT_CARD_H,
  CAT_CARD_Y,
  CAT_LVL_Y,
  CAT_INCOME_Y,
  CAT_LOCK_LVL_Y,
  CAT_LABEL_FONT,
  catDeckLabelsFit
};
