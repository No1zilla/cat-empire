/** Не поднимать max_cat_level из аналитики, если в БД уже чистый старт (после сброса). */
export function shouldRestoreProgressFloor(user = {}) {
  const level = Number(user.maxCatLevel) || 1;
  const merges = Number(user.totalMerges) || 0;
  const bought = Number(user.totalCatsBought) || 0;
  if (level <= 1 && merges <= 0 && bought <= 2) return false;
  return true;
}

export default shouldRestoreProgressFloor;
