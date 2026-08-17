import { CONFIG } from '../config.js';

/**
 * Первая сессия: человек должен понять котов, а не кассу.
 * Меню, календарь, заполнить/соединить/2× — после первого слияния.
 */

export function shouldRevealMidgameChrome({ maxCatLevel = 1, totalMerges = 0 } = {}) {
  return (Number(maxCatLevel) || 1) > 1 || (Number(totalMerges) || 0) > 0;
}

export function shouldOfferDailyNow({
  chromeRevealed = false,
  canClaim = false,
  alreadyOffered = false
} = {}) {
  return Boolean(chromeRevealed) && Boolean(canClaim) && !alreadyOffered;
}

export function shouldSkipBootMenu() {
  return true;
}

export function getTutorialTargets() {
  const cell = CONFIG.CELL_SIZE;
  const pad = CONFIG.GRID_PADDING;
  const gridW = 5 * (cell + pad) + pad;
  const gridX = Math.max(0, Math.floor((CONFIG.GAME_WIDTH - gridW) / 2));
  const gridY = 58;
  return {
    slots: {
      x: gridX + pad,
      y: gridY + pad,
      w: cell * 2 + pad,
      h: cell
    }
  };
}

export default {
  shouldRevealMidgameChrome,
  shouldOfferDailyNow,
  shouldSkipBootMenu,
  getTutorialTargets
};
