import { eventBus } from '../utils/EventBus.js';

/**
 * Изолированный Модульный Звуковой Менеджер Web Audio API.
 * Автоматически реагирует на события EventBus с нулевой связностью с UI компонентов.
 */
export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this._initListeners();
  }

  _initListeners() {
    eventBus.on('CATS_MERGED', () => this.playMerge());
    eventBus.on('COINS_SPENT', () => this.playBuy());
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

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!this.enabled) return;
    try {
      this._ensureContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Игнорируем фоновые аудиоошибки
    }
  }

  playMerge() {
    this.playTone(523.25, 'triangle', 0.2, 0.15); // C5 tone
  }

  playBuy() {
    this.playTone(659.25, 'sine', 0.12, 0.1); // E5 tone
  }
}

export const soundManager = new SoundManager();
export default soundManager;
