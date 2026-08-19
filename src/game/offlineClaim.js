/**
 * Офлайн-доход: монеты сразу, облако в фоне.
 * Нельзя ждать Railway/VK Storage — игрок уже нажал «забрать».
 */

export function resolveOfflinePayout({ isTriple = false, adSuccess = false, baseCoins = 0, tripleCoins = 0 } = {}) {
  const base = Math.max(0, Math.round(Number(baseCoins) || 0));
  const triple = Math.max(base, Math.round(Number(tripleCoins) || 0));
  if (!isTriple) return { ok: true, earned: base, multiplier: 1 };
  if (adSuccess) return { ok: true, earned: triple, multiplier: 3 };
  return { ok: false, earned: 0, multiplier: 0 };
}

export function grantOfflineCoins(economy, amount) {
  const earned = Math.max(0, Math.round(Number(amount) || 0));
  if (!economy || !earned) return 0;
  economy.coins = (Number(economy.coins) || 0) + earned;
  if (typeof economy._notify === 'function') economy._notify();
  return earned;
}

export function persistOfflineClaim(saveFn) {
  if (typeof saveFn !== 'function') return;
  try {
    const result = saveFn();
    if (result && typeof result.then === 'function') {
      result.catch(() => {});
    }
  } catch (e) {}
}
