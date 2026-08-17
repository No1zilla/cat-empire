import { INCOME_BOOSTER_MS, INCOME_BOOSTER_MULTIPLIER } from '../config/rubyShop.js';

const STORAGE_KEY = 'cat_empire_booster_expires_at';

export class IncomeBoosterService {
  constructor(storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : {
      getItem: () => null,
      setItem: () => {}
    });
  }

  getExpiresAt() {
    const raw = Number(this.storage.getItem(STORAGE_KEY) || 0);
    return Number.isFinite(raw) ? raw : 0;
  }

  isActive(now = Date.now()) {
    return this.getExpiresAt() > now;
  }

  remainingMs(now = Date.now()) {
    return Math.max(0, this.getExpiresAt() - now);
  }

  getMultiplier(now = Date.now()) {
    return this.isActive(now) ? INCOME_BOOSTER_MULTIPLIER : 1;
  }

  activate(now = Date.now(), durationMs = INCOME_BOOSTER_MS, extend = false) {
    const duration = Math.max(1000, Number(durationMs) || INCOME_BOOSTER_MS);
    const base = extend ? Math.max(now, this.getExpiresAt()) : now;
    const expiresAt = base + duration;
    this.storage.setItem(STORAGE_KEY, String(expiresAt));
    return expiresAt;
  }

  clear() {
    this.storage.setItem(STORAGE_KEY, '0');
  }
}

export const incomeBoosterService = new IncomeBoosterService();
export default incomeBoosterService;
