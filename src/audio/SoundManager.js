import { eventBus } from '../utils/EventBus.js';

/**
 * Звуковой менеджер: короткие SFX + тихий lo-fi BGM на Web Audio API.
 * Mute читается из localStorage и синхронизируется с окном настроек.
 */
export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this._bgmTimer = null;
    this._bgmStep = 0;
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
    try {
      this._ensureContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const startAt = this.audioCtx.currentTime + delay;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainVal), startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    } catch {
      // Игнорируем фоновые аудиоошибки
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

    const scale = [196, 246.94, 293.66, 329.63, 392, 329.63, 293.66, 246.94];
    this._bgmStep = 0;
    this._bgmTimer = setInterval(() => {
      if (!this.enabled || !this.musicEnabled) return;
      const note = scale[this._bgmStep % scale.length];
      this.playTone(note, 'sine', 0.42, 0.028);
      this._bgmStep += 1;
    }, 520);
  }

  stopBgm() {
    if (this._bgmTimer) {
      clearInterval(this._bgmTimer);
      this._bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
export default soundManager;
