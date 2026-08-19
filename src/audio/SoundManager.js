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
 * Тёплый двор: мажор, без писка C6 и без хэтов.
 * Тише и мягче, но не похоронная синусоида.
 */
export const BGM_LOOP = {
  bpm: 100,
  melodyGain: 0.02,
  bassGain: 0.024,
  cutoffHz: 980,
  hats: false,
  melody: [
    C5, E5, G5, E5, A5, G5, E5, G5,
    C5, D5, E5, G5, A5, G5, E5, D5,
    F5, A5, G5, E5, D5, E5, G5, A5,
    G5, E5, C5, E5, D5, C5, G4, C5
  ],
  bass: [
    C3, 0, G3, 0, C3, 0, E3, 0,
    G3, 0, D4, 0, G3, 0, B3, 0,
    F3, 0, C4, 0, F3, 0, A3, 0,
    C3, 0, G3, 0, C4, 0, C3, 0
  ]
};

export function getBgmStepSeconds(bpm = BGM_LOOP.bpm) {
  return 60 / bpm / 2;
}

/** Ещё тише и ниже: C4–E4–G4, все синусы, длинная атака. */
export const MERGE_SFX = {
  notes: [C4, E4, G4],
  delays: [0, 0.12, 0.24],
  durations: [0.5, 0.56, 0.68],
  gains: [0.014, 0.012, 0.01],
  cutoff: 460,
  attack: 0.11
};

/**
 * Звуковой менеджер: короткие SFX + тихий мажорный BGM на Web Audio API.
 * Mute читается из localStorage и синхронизируется с окном настроек.
 */
export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this._bgmTimer = null;
    this._bgmStep = 0;
    this._bgmNextTime = 0;
    this._bgmGen = 0;
    this._unlocked = false;
    this._loadPrefs();
    this._initListeners();
  }

  _loadPrefs() {
    if (typeof localStorage === 'undefined') return;
    try {
      this.enabled = localStorage.getItem('cat_empire_sound_muted') !== '1';
      this.musicEnabled = localStorage.getItem('cat_empire_music_muted') !== '1';
    } catch {
      this.enabled = true;
      this.musicEnabled = true;
    }
  }

  _initListeners() {
    eventBus.on('CATS_MERGED', (data) => this.playMerge(data && data.combo));
    eventBus.on('COINS_SPENT', () => this.playBuy());
    eventBus.on('CAT_SPAWNED', () => this.playMeow());
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
    const mix = { cutoff: MERGE_SFX.cutoff, attack: MERGE_SFX.attack };
    MERGE_SFX.notes.forEach((freq, i) => {
      this.playTone(freq, 'sine', MERGE_SFX.durations[i], MERGE_SFX.gains[i], MERGE_SFX.delays[i], mix);
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
    const swing = i % 2 === 1 ? 0.012 : 0;
    const t = when + swing;
    const mix = { cutoff: BGM_LOOP.cutoffHz, attack: 0.05 };

    if (melody) this._scheduleTone(melody, 'sine', 0.28, BGM_LOOP.melodyGain, t, mix);
    if (bass) this._scheduleTone(bass, 'sine', 0.42, BGM_LOOP.bassGain, t, { cutoff: 520, attack: 0.06 });
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
