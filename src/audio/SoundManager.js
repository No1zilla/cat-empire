import { eventBus } from '../utils/EventBus.js';

const C3 = 130.81;
const E3 = 164.81;
const F3 = 174.61;
const G3 = 196.00;
const A3 = 220.00;
const B3 = 246.94;
const C4 = 261.63;
const D4 = 293.66;
const G4 = 392.00;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const F5 = 698.46;
const G5 = 783.99;
const A5 = 880.00;
const C6 = 1046.50;

/**
 * Двор Империи Котиков: мажор, щипок + бас, не похоронная синусоида.
 * 32 восьмых при 116 BPM — прыгает вверх, садится в до, не ползёт вниз.
 */
export const BGM_LOOP = {
  bpm: 116,
  melody: [
    C5, E5, G5, C6, A5, G5, E5, G5,
    C5, D5, E5, G5, A5, C6, G5, E5,
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

/**
 * Звуковой менеджер: короткие SFX + живой мажорный BGM на Web Audio API.
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
    this._noiseBuffer = null;
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

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, delay = 0) {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.audioCtx) return;
    const when = this.audioCtx.currentTime + delay;
    this._scheduleTone(freq, type, duration, gainVal, when);
  }

  _scheduleTone(freq, type, duration, gainVal, when) {
    if (!freq || freq <= 0 || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, when);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'sine' ? 1400 : 2200, when);

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainVal), when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(when);
      osc.stop(when + duration + 0.02);
    } catch {
      // Игнорируем фоновые аудиоошибки
    }
  }

  _ensureNoise() {
    if (this._noiseBuffer || !this.audioCtx) return;
    const length = Math.max(1, Math.floor(this.audioCtx.sampleRate * 0.04));
    const buffer = this.audioCtx.createBuffer(1, length, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buffer;
  }

  _playHat(when) {
    if (!this.audioCtx) return;
    try {
      this._ensureNoise();
      if (!this._noiseBuffer) return;
      const src = this.audioCtx.createBufferSource();
      src.buffer = this._noiseBuffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, when);
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.01, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.035);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      src.start(when);
      src.stop(when + 0.04);
    } catch {
      // ignore
    }
  }

  playMerge(combo = 1) {
    const boost = Math.min(3, Math.max(1, Number(combo) || 1));
    this.playTone(523.25, 'triangle', 0.16, 0.12);
    this.playTone(659.25, 'triangle', 0.18, 0.1, 0.05);
    this.playTone(783.99 + boost * 20, 'sine', 0.22, 0.08, 0.1);
  }

  playBuy() {
    this.playTone(880, 'square', 0.07, 0.05);
    this.playTone(1174.66, 'sine', 0.12, 0.08, 0.05);
  }

  playMeow() {
    this.playTone(620, 'sawtooth', 0.09, 0.045);
    this.playTone(480, 'triangle', 0.14, 0.05, 0.06);
  }

  playLevelUp() {
    this.playTone(523.25, 'triangle', 0.12, 0.1);
    this.playTone(659.25, 'triangle', 0.12, 0.1, 0.1);
    this.playTone(783.99, 'triangle', 0.14, 0.1, 0.2);
    this.playTone(1046.5, 'sine', 0.28, 0.12, 0.32);
  }

  playClick() {
    this.playTone(740, 'square', 0.05, 0.035);
  }

  playReward() {
    this.playTone(659.25, 'sine', 0.12, 0.09);
    this.playTone(880, 'sine', 0.16, 0.1, 0.08);
    this.playTone(1318.5, 'triangle', 0.22, 0.08, 0.16);
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
    const swing = i % 2 === 1 ? 0.018 : 0;
    const t = when + swing;

    if (melody) this._scheduleTone(melody, 'triangle', 0.2, 0.042, t);
    if (bass) this._scheduleTone(bass, 'sine', 0.34, 0.038, t);
    if (i % 2 === 1) this._playHat(t);
    if (i % 8 === 0 && melody) this._scheduleTone(melody * 2, 'sine', 0.12, 0.012, t);
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
