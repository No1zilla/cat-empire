/**
 * 7-дневный календарь входа (TASK-020).
 * Хранится отдельно от tri-state прогресса, чтобы не ломать синхронизацию поля.
 */

export const DAILY_REWARD_TABLE = [
  { day: 1, coins: 500, gems: 0, catLevel: 0, label: '500 🪙' },
  { day: 2, coins: 0, gems: 10, catLevel: 0, label: '10 💎' },
  { day: 3, coins: 0, gems: 0, catLevel: 3, label: 'Кот 3 ур.' },
  { day: 4, coins: 2500, gems: 0, catLevel: 0, label: '2 500 🪙' },
  { day: 5, coins: 0, gems: 25, catLevel: 0, label: '25 💎' },
  { day: 6, coins: 0, gems: 0, catLevel: 5, label: 'Кот 5 ур.' },
  { day: 7, coins: 0, gems: 50, catLevel: 7, label: 'Кот 7 ур. + 50 💎' }
];

const STORAGE_KEY = 'cat_empire_daily_v1';

export function getLocalDateKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetweenKeys(fromKey, toKey) {
  if (!fromKey || !toKey) return null;
  const from = Date.parse(`${fromKey}T00:00:00`);
  const to = Date.parse(`${toKey}T00:00:00`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round((to - from) / 86400000);
}

function readStore(storage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return { lastClaimDate: null, cycleDay: 1, streak: 0 };
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { lastClaimDate: null, cycleDay: 1, streak: 0 };
    const parsed = JSON.parse(raw);
    return {
      lastClaimDate: parsed.lastClaimDate || null,
      cycleDay: Math.min(7, Math.max(1, Number(parsed.cycleDay) || 1)),
      streak: Math.max(0, Number(parsed.streak) || 0)
    };
  } catch {
    return { lastClaimDate: null, cycleDay: 1, streak: 0 };
  }
}

function writeStore(storage, data) {
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export class DailyRewardsService {
  constructor(storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  }

  getState(now = Date.now()) {
    const saved = readStore(this.storage);
    const today = getLocalDateKey(now);

    if (saved.lastClaimDate === today) {
      return {
        ...saved,
        today,
        canClaim: false,
        claimedToday: true,
        currentDay: saved.cycleDay,
        reward: DAILY_REWARD_TABLE[saved.cycleDay - 1]
      };
    }

    if (!saved.lastClaimDate) {
      return {
        lastClaimDate: null,
        cycleDay: 1,
        streak: 0,
        today,
        canClaim: true,
        claimedToday: false,
        currentDay: 1,
        reward: DAILY_REWARD_TABLE[0]
      };
    }

    const gap = daysBetweenKeys(saved.lastClaimDate, today);
    if (gap === 1) {
      const nextDay = saved.cycleDay >= 7 ? 1 : saved.cycleDay + 1;
      return {
        lastClaimDate: saved.lastClaimDate,
        cycleDay: nextDay,
        streak: saved.streak,
        today,
        canClaim: true,
        claimedToday: false,
        currentDay: nextDay,
        reward: DAILY_REWARD_TABLE[nextDay - 1]
      };
    }

    return {
      lastClaimDate: saved.lastClaimDate,
      cycleDay: 1,
      streak: 0,
      today,
      canClaim: true,
      claimedToday: false,
      currentDay: 1,
      reward: DAILY_REWARD_TABLE[0],
      reset: true
    };
  }

  claim(now = Date.now()) {
    const state = this.getState(now);
    if (!state.canClaim) return null;

    const next = {
      lastClaimDate: getLocalDateKey(now),
      cycleDay: state.currentDay,
      streak: (state.streak || 0) + 1
    };
    writeStore(this.storage, next);
    return { ...state.reward, streak: next.streak };
  }
}

export const dailyRewardsService = new DailyRewardsService();
export default dailyRewardsService;
