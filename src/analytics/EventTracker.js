// src/analytics/EventTracker.js
// TASK-066: Модуль трекинга аналитических событий с батчингом и офлайн-буферизацией

function resolveAnalyticsApiBase() {
  if (typeof window === 'undefined') return 'https://cat-empire-production.up.railway.app/api';
  const origin = String(window.location.origin || '');
  if (
    origin.includes('railway.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('vercel.app')
  ) {
    return '/api';
  }
  return 'https://cat-empire-production.up.railway.app/api';
}

const API_BASE = resolveAnalyticsApiBase();

const OFFLINE_CACHE_KEY = 'cat_empire_offline_events_v1';

export class EventTracker {
  constructor(userId = 'guest', platform = 'vk') {
    this.userId = this._resolveUserId(userId);
    this.platform = String(platform);
    this.sessionId = this._generateSessionId();
    this.queue = this._loadOfflineEvents();
    this.sessionStartTime = Date.now();
    this.isFlushing = false;

    // Автоматическая батчевая отправка каждые 10 секунд
    if (typeof window !== 'undefined') {
      this._flushInterval = setInterval(() => this.flush(), 10000);

      // Трекинг завершения сессии при закрытии вкладки / приложения
      window.addEventListener('beforeunload', () => {
        this.trackSessionEnd();
        this.flushSync();
      });

      // Восстановление сети
      window.addEventListener('online', () => {
        this.flush();
      });
    }

    // Авто-трекинг старта сессии
    this.trackSessionStart();
  }

  _resolveUserId(providedId) {
    if (providedId && providedId !== 'guest' && providedId !== '0') return String(providedId);
    if (typeof localStorage !== 'undefined') {
      const savedVk = localStorage.getItem('cat_empire_vk_user_id');
      if (savedVk && savedVk !== '0') return String(savedVk);

      let savedGuest = localStorage.getItem('cat_empire_analytics_uid');
      if (!savedGuest) {
        savedGuest = 'guest_' + Math.random().toString(36).substring(2, 10);
        try { localStorage.setItem('cat_empire_analytics_uid', savedGuest); } catch(e){}
      }
      return savedGuest;
    }
    return String(providedId || 'guest');
  }

  _generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  setUserId(userId) {
    if (userId && String(userId) !== '0') {
      this.userId = String(userId);
    }
  }

  setPlatform(platform) {
    if (platform) {
      this.platform = String(platform);
    }
  }

  track(eventName, props = {}) {
    const event = {
      event: eventName,
      user_id: this.userId,
      session_id: this.sessionId,
      platform: this.platform,
      timestamp: Date.now(),
      props
    };

    this.queue.push(event);
    this._saveOfflineEvents();

    // Если накопилось >= 10 событий — отправляем немедленно
    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  // --- Хелперы для ключевых событий (TASK-066) ---

  trackSessionStart() {
    this.track('session_start', {
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      screen_width: typeof window !== 'undefined' ? window.innerWidth : 0,
      screen_height: typeof window !== 'undefined' ? window.innerHeight : 0
    });
  }

  trackSessionEnd() {
    const durationSeconds = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    this.track('session_end', {
      duration_seconds: durationSeconds
    });
  }

  trackCatBought(cost, totalCatsBought, coinsBalance) {
    this.track('cat_bought', {
      cost: Number(cost),
      total_cats_bought: Number(totalCatsBought),
      coins_balance: Number(coinsBalance)
    });
  }

  trackFillAllTriggered(count, cost, freeSlots) {
    this.track('fill_all_triggered', {
      count: Number(count),
      cost: Number(cost),
      free_slots: Number(freeSlots)
    });
  }

  trackManualMerge(levelFrom, levelTo) {
    this.track('merge_manual', {
      level_from: Number(levelFrom),
      level_to: Number(levelTo)
    });
  }

  trackAutoMergeTriggered(gemsSpent, mergesCount) {
    this.track('merge_auto_triggered', {
      gems_spent: Number(gemsSpent),
      merges_count: Number(mergesCount)
    });
  }

  trackAdRequested(adType) {
    this.track('ad_requested', { ad_type: adType });
  }

  trackAdShown(adType, isTestAd = false) {
    this.track('ad_shown', { ad_type: adType, is_test_ad: Boolean(isTestAd) });
  }

  trackAdCompleted(adType, rewardGems = 5) {
    this.track('ad_completed', { ad_type: adType, reward_gems: Number(rewardGems) });
  }

  trackAdFailed(adType, errorReason = 'unknown', extra = {}) {
    this.track('ad_failed', {
      ad_type: adType,
      error_reason: String(errorReason || 'unknown').slice(0, 160),
      ...(extra && typeof extra === 'object' ? extra : {})
    });
  }

  trackAdSkipped(adType, extra = {}) {
    this.track('ad_skipped', {
      ad_type: adType,
      ...(extra && typeof extra === 'object' ? extra : {})
    });
  }

  trackMaxCatLevelReached(level) {
    this.track('max_cat_level_reached', { level: Number(level) });
  }

  trackOfflineBonusClaimed(coins, multiplier, offlineSeconds) {
    this.track('offline_bonus_claimed', {
      coins: Number(coins),
      multiplier: Number(multiplier),
      offline_seconds: Number(offlineSeconds)
    });
  }

  trackShareTriggered(type) {
    this.track('share_triggered', { type });
  }

  // --- Отправка данных ---

  async flush() {
    if (!this.queue.length || this.isFlushing) return false;
    this.isFlushing = true;

    const batch = [...this.queue];

    try {
      const response = await fetch(`${API_BASE}/events/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch })
      });

      if (response.ok) {
        // Успешно отправлено — удаляем отправленный батч из очереди
        this.queue = this.queue.slice(batch.length);
        this._saveOfflineEvents();
        this.isFlushing = false;
        return true;
      } else {
        throw new Error(`HTTP status ${response.status}`);
      }
    } catch (e) {
      // При ошибке сети события остаются в офлайн очереди
      this.isFlushing = false;
      return false;
    }
  }

  flushSync() {
    if (!this.queue.length) return;
    const batch = [...this.queue];
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE}/events/batch`, blob);
      }
    } catch (e) {}
  }

  _loadOfflineEvents() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _saveOfflineEvents() {
    if (typeof localStorage === 'undefined') return;
    try {
      // Сохраняем максимум последние 500 событий, чтобы не забить LocalStorage
      const toSave = this.queue.slice(-500);
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(toSave));
    } catch (e) {}
  }

  destroy() {
    if (this._flushInterval) {
      clearInterval(this._flushInterval);
      this._flushInterval = null;
    }
  }
}

// Синглтон экземпляр для приложения
export const eventTracker = new EventTracker();
