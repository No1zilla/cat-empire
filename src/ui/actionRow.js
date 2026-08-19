import { CONFIG, pointerToGameX } from '../config.js';

/** Три одинаковые кнопки ровно на 410: поля 10, кнопка 126, щель 6. */
export const ACTION_BTN_W = 126;
export const ACTION_BTN_H = 50;
export const ACTION_BTN_GAP = 6;
export const ACTION_ROW_MARGIN = 10;

export function actionButtonX(index = 0) {
  const i = Math.max(0, Number(index) || 0);
  return ACTION_ROW_MARGIN + i * (ACTION_BTN_W + ACTION_BTN_GAP);
}

export function actionRowWidth() {
  return ACTION_ROW_MARGIN * 2 + ACTION_BTN_W * 3 + ACTION_BTN_GAP * 2;
}

export function actionRowFitsGame() {
  return actionRowWidth() === (CONFIG.GAME_WIDTH || 410);
}

export function actionButtonHit(index = 0, y = 0) {
  return {
    x: actionButtonX(index),
    y: Number(y) || 0,
    w: ACTION_BTN_W,
    h: ACTION_BTN_H
  };
}

export function actionHitsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Какая кнопка под пальцем: 0 Купить, 1 Заполнить, 2 Соединить, иначе -1. */
export function actionButtonIndexAt(localX) {
  const x = Number(localX);
  if (!Number.isFinite(x)) return -1;
  for (let i = 0; i < 3; i++) {
    const left = actionButtonX(i);
    if (x >= left && x < left + ACTION_BTN_W) return i;
  }
  return -1;
}

export function runActionPress(index, handlers = {}) {
  if (index === 0 && typeof handlers.buy === 'function') handlers.buy();
  else if (index === 1 && typeof handlers.fill === 'function') handlers.fill();
  else if (index === 2 && typeof handlers.merge === 'function') handlers.merge();
}

/** Тап по CSS-канвасу → индекс кнопки. rowWorldX = 0, если ряд не сдвинут. */
export function clientXToActionIndex(clientX, canvasRect, rowWorldX = 0, gameWidth = CONFIG.GAME_WIDTH) {
  const gameX = pointerToGameX(clientX, canvasRect, gameWidth);
  if (!Number.isFinite(gameX)) return -1;
  return actionButtonIndexAt(gameX - (Number(rowWorldX) || 0));
}

export default {
  ACTION_BTN_W,
  ACTION_BTN_H,
  ACTION_BTN_GAP,
  ACTION_ROW_MARGIN,
  actionButtonX,
  actionRowWidth,
  actionRowFitsGame,
  actionButtonHit,
  actionHitsOverlap,
  actionButtonIndexAt,
  clientXToActionIndex
};
