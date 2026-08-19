import { CONFIG } from '../config.js';

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

export default {
  ACTION_BTN_W,
  ACTION_BTN_H,
  ACTION_BTN_GAP,
  ACTION_ROW_MARGIN,
  actionButtonX,
  actionRowWidth,
  actionRowFitsGame,
  actionButtonHit,
  actionHitsOverlap
};
