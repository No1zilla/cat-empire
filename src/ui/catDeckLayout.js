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
export const CAT_DECK_GAP = 8;
export const CAT_DECK_MASK_X = 48;
export const CAT_DECK_CARD_PAD = 8;
export const CAT_DECK_CARD_START_X = CAT_DECK_MASK_X + 4;

export function catDeckCardHit(index = 0, cardY = CAT_CARD_Y) {
  const i = Math.max(0, Number(index) || 0);
  return {
    x: CAT_DECK_CARD_START_X + i * (CAT_CARD_W + CAT_DECK_CARD_PAD),
    y: Number(cardY) || CAT_CARD_Y,
    w: CAT_CARD_W,
    h: CAT_CARD_H
  };
}

/** localX/Y в системе _cardsContainer (скролл уже в трансформе). */
export function catDeckCardIndexAt(localX, localY, cardY = CAT_CARD_Y) {
  const y0 = Number(cardY) || CAT_CARD_Y;
  if (!Number.isFinite(localX) || !Number.isFinite(localY)) return -1;
  if (localY < y0 || localY >= y0 + CAT_CARD_H) return -1;
  for (let i = 0; i < 15; i++) {
    const hit = catDeckCardHit(i, y0);
    if (localX >= hit.x && localX < hit.x + hit.w) return i;
  }
  return -1;
}

export function catDeckLabelsFit(deckH = CAT_DECK_H) {
  const labelBottom = Math.max(CAT_INCOME_Y, CAT_LOCK_LVL_Y) + CAT_LABEL_FONT + 2;
  return CAT_CARD_Y + CAT_CARD_H <= deckH - 6 && labelBottom <= CAT_CARD_H;
}

/**
 * Котопедия сразу под Купить / Заполнить / Соединить (и live-ops, если он есть).
 * Лишняя высота iframe уходит в саму панель — дыры между кнопками и колодой нет.
 */
export function catDeckFrame({
  buttonRowY = 0,
  actionBtnH = 50,
  liveOpsH = 0,
  gameHeight = 700,
  minDeckH = CAT_DECK_H,
  bottomPad = CAT_DECK_BOTTOM_PAD,
  gap = CAT_DECK_GAP
} = {}) {
  const opsY = buttonRowY + actionBtnH + gap;
  const y = liveOpsH > 0 ? opsY + liveOpsH + gap : opsY;
  const h = Math.max(minDeckH, gameHeight - y - bottomPad);
  return { y, h };
}

export function catDeckY(opts = {}) {
  return catDeckFrame(opts).y;
}

export function catDeckCardY(deckH = CAT_DECK_H) {
  const extra = Math.max(0, (Number(deckH) || CAT_DECK_H) - CAT_DECK_H);
  return CAT_CARD_Y + Math.floor(extra / 2);
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
  CAT_DECK_GAP,
  catDeckLabelsFit,
  catDeckFrame,
  catDeckY,
  catDeckCardY,
  catDeckCardHit,
  catDeckCardIndexAt
};
