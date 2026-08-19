/** Высота колоды: подписи Lvl / доход живут внутри карточки, не режутся по низу. */
export const CAT_DECK_H = 116;
export const CAT_CARD_W = 54;
export const CAT_CARD_H = 78;
export const CAT_CARD_Y = 30;
export const CAT_LVL_Y = 52;
export const CAT_INCOME_Y = 64;
export const CAT_LOCK_LVL_Y = 60;
export const CAT_LABEL_FONT = 9;

export const CAT_DECK_BOTTOM_PAD = 8;

export function catDeckLabelsFit(deckH = CAT_DECK_H) {
  const labelBottom = Math.max(CAT_INCOME_Y, CAT_LOCK_LVL_Y) + CAT_LABEL_FONT + 2;
  return CAT_CARD_Y + CAT_CARD_H <= deckH - 6 && labelBottom <= CAT_CARD_H;
}

/** Котопедия прижата к низу холста, но не наезжает на Купить / Заполнить / Соединить. */
export function catDeckY({
  buttonRowY = 0,
  actionBtnH = 50,
  liveOpsH = 0,
  gameHeight = 700,
  deckH = CAT_DECK_H,
  bottomPad = CAT_DECK_BOTTOM_PAD
} = {}) {
  const opsY = buttonRowY + actionBtnH + 8;
  const minY = liveOpsH ? opsY + liveOpsH + 8 : opsY;
  const bottomY = gameHeight - deckH - bottomPad;
  return Math.max(minY, bottomY);
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
  CAT_DECK_BOTTOM_PAD,
  catDeckLabelsFit,
  catDeckY
};
