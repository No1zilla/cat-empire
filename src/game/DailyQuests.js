/**
 * Ежедневные задания (TASK-029): 3 квеста в день, детерминированный набор по дате.
 */

import { getLocalDateKey } from './DailyRewards.js';

const STORAGE_KEY = 'cat_empire_quests_v1';

export const QUEST_POOL = [
  { id: 'merge_8', type: 'merge', target: 8, rewardGems: 3, title: 'Соедини 8 котиков' },
  { id: 'merge_15', type: 'merge', target: 15, rewardGems: 5, title: 'Соедини 15 котиков' },
  { id: 'buy_12', type: 'buy', target: 12, rewardGems: 3, title: 'Купи 12 котиков' },
  { id: 'buy_20', type: 'buy', target: 20, rewardGems: 5, title: 'Купи 20 котиков' },
  { id: 'auto_1', type: 'auto_merge', target: 1, rewardGems: 2, title: 'Используй «Соединить»' },
  { id: 'auto_2', type: 'auto_merge', target: 2, rewardGems: 4, title: 'Используй «Соединить» 2 раза' }
];

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickQuestsForDate(dateKey) {
  const seed = hashString(String(dateKey || 'default'));
  const byType = {};
  QUEST_POOL.forEach((q) => {
    if (!byType[q.type]) byType[q.type] = [];
    byType[q.type].push(q);
  });
  const types = Object.keys(byType).sort();
  return types.map((type, index) => {
    const options = byType[type];
    const picked = options[(seed + index * 17) % options.length];
    return {
      id: picked.id,
      type: picked.type,
      target: picked.target,
      rewardGems: picked.rewardGems,
      title: picked.title,
      progress: 0,
      claimed: false
    };
  });
}

function readStore(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(storage, data) {
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export class DailyQuestsService {
  constructor(storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  }

  _ensure(now = Date.now()) {
    const today = getLocalDateKey(now);
    const saved = readStore(this.storage);
    if (saved && saved.date === today && Array.isArray(saved.quests) && saved.quests.length === 3) {
      return saved;
    }
    const fresh = { date: today, quests: pickQuestsForDate(today) };
    writeStore(this.storage, fresh);
    return fresh;
  }

  getState(now = Date.now()) {
    const state = this._ensure(now);
    const claimable = state.quests.filter((q) => q.progress >= q.target && !q.claimed).length;
    const completed = state.quests.filter((q) => q.claimed).length;
    return { ...state, claimable, completed, allDone: completed === state.quests.length };
  }

  progress(type, amount = 1, now = Date.now()) {
    const state = this._ensure(now);
    let changed = false;
    state.quests.forEach((quest) => {
      if (quest.type === type && !quest.claimed && quest.progress < quest.target) {
        quest.progress = Math.min(quest.target, quest.progress + Math.max(0, Number(amount) || 0));
        changed = true;
      }
    });
    if (changed) writeStore(this.storage, state);
    return this.getState(now);
  }

  claim(questId, now = Date.now()) {
    const state = this._ensure(now);
    const quest = state.quests.find((q) => q.id === questId);
    if (!quest || quest.claimed || quest.progress < quest.target) return null;
    quest.claimed = true;
    writeStore(this.storage, state);
    return quest;
  }
}

export const dailyQuestsService = new DailyQuestsService();
export default dailyQuestsService;
