import { eventBus } from '../utils/EventBus.js';

const C3 = 130.81;
const E3 = 164.81;
const F3 = 174.61;
const G3 = 196.00;
const A3 = 220.00;
const B3 = 246.94;
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392.00;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const F5 = 698.46;
const G5 = 783.99;
const A5 = 880.00;

/**
 * Спокойный двор: колыбельный мажор, воздух между нотами, без A5.
 */
export const BGM_LOOP = {
  bpm: 76,
  melodyGain: 0.011,
  bassGain: 0.014,
  cutoffHz: 580,
  hats: false,
  melodyDur: 0.9,
  bassDur: 1.2,
  attack: 0.14,
  melody: [
    C5, 0, E5, 0, G4, 0, C5, 0,
    E5, 0, D5, 0, C5, 0, G4, 0,
    C5, 0, E5, 0, G4, 0, E5, 0,
    D5, 0, C5, 0, G4, 0, 0, C5
  ],
  bass: [
    C3, 0, 0, 0, G3, 0, 0, 0,
    E3, 0, 0, 0, C3, 0, 0, 0,
    F3, 0, 0, 0, C4, 0, 0, 0,
    G3, 0, 0, 0, C3, 0, 0, 0
  ]
};

export function getBgmStepSeconds(bpm = BGM_LOOP.bpm) {
  return 60 / bpm / 2;
}

/** Однобитка выключена, пока игрок сам не включит в настройках. */
export function readMusicEnabledPref() {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem('cat_empire_music_muted') === '0';
  } catch {
    return false;
  }
}

/** Тихий воздух на «Заполнить»: без треугольника и без C6. */
export const FILL_SFX = {
  notes: [E4, G4],
  delays: [0, 0.07],
  durations: [0.24, 0.3],
  gains: [0.008, 0.006],
  cutoff: 460,
  attack: 0.09
};

/** Тихий C4–E4–G4. Не чаще cooldown — иначе «Заполнить» каждую секунду тошнит. */
export const MERGE_SFX = {
  notes: [C4, E4, G4],
  delays: [0, 0.09, 0.18],
  durations: [0.28, 0.32, 0.38],
  gains: [0.009, 0.007, 0.006],
  cutoff: 430,
  attack: 0.1,
  cooldownMs: 700
};

/**
 * Звуковой менеджер: короткие SFX + тихий мажорный BGM на Web Audio API.
 * Mute читается из localStorage и синхронизируется с окном настроек.
 */
export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.musicEnabled = false;
    this._bgmTimer = null;
    this._bgmStep = 0;
    this._bgmNextTime = 0;
    this._bgmGen = 0;
    this._unlocked = false;
    this._lastMergeAt = 0;
    this._loadPrefs();
    this._initListeners();
  }

  _loadPrefs() {
    if (typeof localStorage === 'undefined') return;
    try {
      this.enabled = localStorage.getItem('cat_empire_sound_muted') !== '1';
      this.musicEnabled = readMusicEnabledPref();
    } catch {
      this.enabled = true;
      this.musicEnabled = false;
    }
  }

  _initListeners() {
    eventBus.on('CATS_MERGED', (data) => this.playMerge(data && data.combo));
    eventBus.on('COINS_SPENT', (data) => {
      if (data && data.fill) this.playFill();
      else this.playBuy();
    });
    eventBus.on('CAT_SPAWNED', (data) => {
      if (data && data.fill) return;
      this.playMeow();
    });
    eventBus.on('NEW_CAT_UNLOCKED', () => this.playLevelUp());
    eventBus.on('UI_CLICK', () => this.playClick());
    eventBus.on('REWARD_CLAIMED', () => this.playReward());
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cat_empire_sound_muted', this.enabled ? '0' : '1');
      } catch { /* ignore */ }
    }
    if (!this.enabled) this.stopBgm();
    else this.startBgm();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cat_empire_music_muted', this.musicEnabled ? '0' : '1');
      } catch { /* ignore */ }
    }
    if (this.musicEnabled) this.startBgm();
    else this.stopBgm();
  }

  unlock() {
    this._unlocked = true;
    this._ensureContext();
    this.startBgm();
  }

  _ensureContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, delay = 0, mix = {}) {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.audioCtx) return;
    const when = this.audioCtx.currentTime + delay;
    this._scheduleTone(freq, type, duration, gainVal, when, {
      cutoff: mix.cutoff || 1500,
      attack: mix.attack || 0.02
    });
  }

  _scheduleTone(freq, type, duration, gainVal, when, mix = {}) {
    if (!freq || freq <= 0 || !this.audioCtx) return;
    const cutoff = mix.cutoff || 1200;
    const attack = mix.attack || 0.03;
    try {
      const osc = this.audioCtx.createOscillator();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();

      osc.type = type === 'square' || type === 'sawtooth' ? 'triangle' : type;
      osc.frequency.setValueAtTime(freq, when);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, when);
      filter.Q.setValueAtTime(0.7, when);

      const peak = Math.max(0.0002, gainVal);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(peak, when + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(when);
      osc.stop(when + duration + 0.03);
    } catch {
      // Игнорируем фоновые аудиоошибки
    }
  }

  playMerge(_combo = 1) {
    const now = Date.now();
    if (this._lastMergeAt && now - this._lastMergeAt < MERGE_SFX.cooldownMs) return;
    this._lastMergeAt = now;
    const mix = { cutoff: MERGE_SFX.cutoff, attack: MERGE_SFX.attack };
    MERGE_SFX.notes.forEach((freq, i) => {
      this.playTone(freq, 'sine', MERGE_SFX.durations[i], MERGE_SFX.gains[i], MERGE_SFX.delays[i], mix);
    });
  }

  playFill() {
    const mix = { cutoff: FILL_SFX.cutoff, attack: FILL_SFX.attack };
    FILL_SFX.notes.forEach((freq, i) => {
      this.playTone(freq, 'sine', FILL_SFX.durations[i], FILL_SFX.gains[i], FILL_SFX.delays[i], mix);
    });
  }

  playBuy() {
    this.playTone(784, 'triangle', 0.1, 0.035);
    this.playTone(1046.5, 'sine', 0.14, 0.04, 0.06);
  }

  playMeow() {
    this.playTone(540, 'triangle', 0.12, 0.03);
    this.playTone(430, 'sine', 0.16, 0.028, 0.07);
  }

  playLevelUp() {
    this.playTone(523.25, 'triangle', 0.14, 0.055);
    this.playTone(659.25, 'triangle', 0.14, 0.055, 0.1);
    this.playTone(783.99, 'sine', 0.18, 0.05, 0.2);
    this.playTone(987.77, 'sine', 0.28, 0.045, 0.32);
  }

  playClick() {
    this.playTone(660, 'triangle', 0.06, 0.018);
  }

  playReward() {
    this.playTone(659.25, 'sine', 0.14, 0.05);
    this.playTone(783.99, 'sine', 0.16, 0.045, 0.08);
    this.playTone(987.77, 'triangle', 0.22, 0.04, 0.16);
  }

  startBgm() {
    this.stopBgm();
    if (!this.enabled || !this.musicEnabled) return;
    if (typeof window === 'undefined') return;
    this._ensureContext();
    if (!this.audioCtx) return;

    const stepDur = getBgmStepSeconds();
    const gen = ++this._bgmGen;
    this._bgmStep = 0;
    this._bgmNextTime = this.audioCtx.currentTime;

    const tick = () => {
      if (gen !== this._bgmGen) return;
      if (!this.enabled || !this.musicEnabled || !this.audioCtx) return;
      const horizon = this.audioCtx.currentTime + 0.18;
      while (this._bgmNextTime < horizon) {
        this._playBgmStep(this._bgmStep, this._bgmNextTime);
        this._bgmStep += 1;
        this._bgmNextTime += stepDur;
      }
      this._bgmTimer = setTimeout(tick, 40);
    };
    tick();
  }

  _playBgmStep(step, when) {
    const i = ((step % BGM_LOOP.melody.length) + BGM_LOOP.melody.length) % BGM_LOOP.melody.length;
    const melody = BGM_LOOP.melody[i];
    const bass = BGM_LOOP.bass[i];
    const t = when;
    const mix = { cutoff: BGM_LOOP.cutoffHz, attack: BGM_LOOP.attack || 0.12 };

    if (melody) this._scheduleTone(melody, 'sine', BGM_LOOP.melodyDur || 0.9, BGM_LOOP.melodyGain, t, mix);
    if (bass) this._scheduleTone(bass, 'sine', BGM_LOOP.bassDur || 1.2, BGM_LOOP.bassGain, t, { cutoff: 420, attack: 0.16 });
  }

  stopBgm() {
    this._bgmGen += 1;
    if (this._bgmTimer) {
      clearTimeout(this._bgmTimer);
      this._bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
export default soundManager;
