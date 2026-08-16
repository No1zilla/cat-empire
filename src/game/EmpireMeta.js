import { getLocalDateKey } from './DailyRewards.js';
import { BALANCE } from '../config/balance.js';

const STORAGE_KEY = 'cat_empire_meta_v1';

function memoryFallback() {
  const map = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null),
    setItem: (key, value) => { map[key] = String(value); }
  };
}

export const STARTER_TRIBUTE = {
  id: 'starter_tribute_5',
  votes: 5,
  rubies: 80,
  boosterMs: 60 * 60 * 1000,
  title: 'Ларец первого трона'
};

export const EDICT = {
  id: 'edict_seven_nights',
  votes: 8,
  rubies: 40,
  dailyRubies: 8,
  durationMs: 7 * 24 * 60 * 60 * 1000,
  title: 'Указ семи ночей'
};

const DEFAULTS = {
  worldIndex: 1,
  worldsCleared: 0,
  mint: 0,
  bestByWorld: { 1: 1 },
  starterTributeClaimed: false,
  starterTributeDeferred: false,
  edictExpiresAt: 0,
  edictLastClaimDate: '',
  idolDate: '',
  idolCount: 0,
  vassalsSummoned: false,
  communityJoined: false,
  pendingFlight: false,
  godClaimedWorld: 0
};

export class EmpireMetaService {
  constructor(storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : memoryFallback());
    this._data = this._load();
  }

  _load() {
    try {
      const raw = JSON.parse(this.storage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return { ...DEFAULTS, bestByWorld: { 1: 1 } };
      return {
        ...DEFAULTS,
        ...raw,
        bestByWorld: { 1: 1, ...(raw.bestByWorld || {}) }
      };
    } catch (e) {
      return { ...DEFAULTS, bestByWorld: { 1: 1 } };
    }
  }

  _save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch (e) {}
  }

  snapshot() {
    return { ...this._data, bestByWorld: { ...this._data.bestByWorld } };
  }

  get worldIndex() { return Math.max(1, Number(this._data.worldIndex) || 1); }
  get worldsCleared() { return Math.max(0, Number(this._data.worldsCleared) || 0); }
  get mint() { return Math.max(0, Number(this._data.mint) || 0); }

  noteBest(worldIndex, level) {
    const w = String(Math.max(1, Number(worldIndex) || 1));
    const prev = Number(this._data.bestByWorld[w] || 1);
    this._data.bestByWorld[w] = Math.max(prev, Number(level) || 1);
    this._save();
  }

  bestFor(worldIndex) {
    const w = String(Math.max(1, Number(worldIndex) || 1));
    return Math.max(1, Number(this._data.bestByWorld[w] || 1));
  }

  markGodClaimed(worldIndex = this.worldIndex) {
    this._data.godClaimedWorld = Number(worldIndex) || 1;
    this._save();
  }

  wasGodClaimed(worldIndex = this.worldIndex) {
    return Number(this._data.godClaimedWorld) === Number(worldIndex);
  }

  setPendingFlight(value) {
    this._data.pendingFlight = Boolean(value);
    this._save();
  }

  flyToNextWorld(currentMaxLevel = 15) {
    this.noteBest(this.worldIndex, currentMaxLevel);
    this._data.worldsCleared = this.worldsCleared + 1;
    this._data.mint = this.mint + BALANCE.mintForClearedWorld(this._data.worldsCleared);
    this._data.worldIndex = this.worldIndex + 1;
    this._data.pendingFlight = false;
    this._data.godClaimedWorld = 0;
    this.noteBest(this._data.worldIndex, 1);
    this._save();
    return this.snapshot();
  }

  claimStarter() {
    this._data.starterTributeClaimed = true;
    this._save();
  }

  deferStarter() {
    this._data.starterTributeDeferred = true;
    this._save();
  }

  get starterOpen() {
    return !this._data.starterTributeClaimed;
  }

  activateEdict(now = Date.now()) {
    this._data.edictExpiresAt = now + EDICT.durationMs;
    this._save();
    return this._data.edictExpiresAt;
  }

  isEdictActive(now = Date.now()) {
    return Number(this._data.edictExpiresAt || 0) > now;
  }

  edictRemainingMs(now = Date.now()) {
    return Math.max(0, Number(this._data.edictExpiresAt || 0) - now);
  }

  canClaimEdictDaily(now = Date.now()) {
    if (!this.isEdictActive(now)) return false;
    return this._data.edictLastClaimDate !== getLocalDateKey(now);
  }

  claimEdictDaily(now = Date.now()) {
    if (!this.canClaimEdictDaily(now)) return null;
    this._data.edictLastClaimDate = getLocalDateKey(now);
    this._save();
    return EDICT.dailyRubies;
  }

  idolRemaining(now = Date.now()) {
    const today = getLocalDateKey(now);
    if (this._data.idolDate !== today) return 3;
    return Math.max(0, 3 - Number(this._data.idolCount || 0));
  }

  recordIdolOffering(now = Date.now()) {
    const today = getLocalDateKey(now);
    if (this._data.idolDate !== today) {
      this._data.idolDate = today;
      this._data.idolCount = 0;
    }
    if (this._data.idolCount >= 3) return false;
    this._data.idolCount += 1;
    this._save();
    return true;
  }

  addMint(amount = 1) {
    this._data.mint = this.mint + Math.max(0, Number(amount) || 0);
    this._save();
    return this._data.mint;
  }

  markVassalsSummoned() {
    this._data.vassalsSummoned = true;
    this._save();
  }

  markCommunityJoined() {
    this._data.communityJoined = true;
    this._save();
  }
}

export const empireMeta = new EmpireMetaService();
export default empireMeta;
