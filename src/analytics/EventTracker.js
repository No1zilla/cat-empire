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

// Отлучка короче получаса — та же сессия. Так считают все мобильные аналитики:
// иначе переключение на мессенджер и обратно плодило бы «сессии».
const SESSION_GAP_MS = 30 * 60 * 1000;

// pagehide и visibilitychange на мобильных прилетают подряд — второй игнорируем
const SESSION_END_DEBOUNCE_MS = 2000;

const FLUSH_NOW = new Set([
  'session_start',
  'session_end',
  'iap_purchase_completed',
  'iap_starter_tribute',
  'iap_edict_bought',
  'ad_completed',
  'ad_failed',
  'return_session',
  'tutorial_skipped',
  'tutorial_completed',
  // Разовое за установку и начало оплаты — терять нельзя,
  // игрок часто уходит из игры сразу после них
  'first_merge',
  'purchase_initiated'
]);

export class EventTracker {
  constructor(userId = 'guest', platform = 'vk') {
    this.userId = this._resolveUserId(userId);
    this.platform = String(platform);
    this.sessionId = this._generateSessionId();
    this.queue = this._loadOfflineEvents();
    this.sessionStartTime = Date.now();
    this.isFlushing = false;

    this.sessionCounters = {};
    this._lastSessionEndAt = 0;
    this._hiddenAt = 0;

    // В VK WebView 10с слишком долго: игрок закрывает сплэш, батч не уходит
    if (typeof window !== 'undefined') {
      this._flushInterval = setInterval(() => this.flush(), 3000);
      this._bindLifecycle();
    }

    // Авто-трекинг старта сессии
    this.trackSessionStart();
    this.trackReturnSession();
    if (typeof window !== 'undefined') this.flush();
  }

  /**
   * beforeunload на iOS и Android часто не срабатывает вовсе — приложение просто
   * уходит в фон и его убивают. Поэтому сессию закрываем по pagehide и по уходу
   * вкладки в hidden, а beforeunload оставляем подстраховкой для десктопа.
   */
  _bindLifecycle() {
    const end = () => {
      this._hiddenAt = Date.now();
      this.trackSessionEnd();
      this.flushSync();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        end();
      } else {
        this._resumeSession();
      }
    });
    window.addEventListener('pagehide', end);
    window.addEventListener('beforeunload', end);
    window.addEventListener('online', () => this.flush());
  }

  /**
   * Вернулись из фона. Короткая отлучка — та же сессия, длинная — новая:
   * иначе переключение на другое приложение и обратно плодило бы сессии.
   */
  _resumeSession() {
    const away = this._hiddenAt ? Date.now() - this._hiddenAt : 0;
    this._hiddenAt = 0;
    if (away < SESSION_GAP_MS) {
      this.flush();
      return;
    }
    this.sessionId = this._generateSessionId();
    this.sessionStartTime = Date.now();
    this.sessionCounters = {};
    this._lastSessionEndAt = 0;
    this.trackSessionStart();
    this.trackReturnSession();
  }

  _vkUserIdFromLaunch() {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem('cat_empire_vk_user_id');
      if (saved && saved !== '0') return String(saved);
    } catch { /* ignore */ }
    try {
      const search = new URLSearchParams(window.location.search || '');
      const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      const id = search.get('vk_user_id') || hash.get('vk_user_id') || '';
      if (id && id !== '0') return String(id);
    } catch { /* ignore */ }
    return '';
  }

  _resolveUserId(providedId) {
    if (providedId && providedId !== 'guest' && providedId !== '0') return String(providedId);
    const fromLaunch = this._vkUserIdFromLaunch();
    if (fromLaunch) return fromLaunch;
    if (typeof localStorage !== 'undefined') {
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

  /**
   * Уникальный id события. Доставка у нас «хотя бы раз»: flushSync шлёт очередь
   * маячком на pagehide и не чистит её, а flush повторяет батч, если ответ не дошёл.
   * Сервер гасит повторы по этому id, поэтому терять события не приходится.
   */
  _generateEventId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  setUserId(userId) {
    if (!userId || String(userId) === '0') return;
    const next = String(userId);
    const prev = this.userId;
    this.userId = next;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('cat_empire_vk_user_id', next); } catch { /* ignore */ }
    }
    if (prev && prev !== next) {
      this.queue.forEach((ev) => {
        if (ev && ev.user_id === prev) ev.user_id = next;
      });
      this._saveOfflineEvents();
      if (typeof window !== 'undefined') this.flush();
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
      event_id: this._generateEventId(),
      user_id: this.userId,
      session_id: this.sessionId,
      platform: this.platform,
      timestamp: Date.now(),
      props
    };

    this.queue.push(event);
    this._saveOfflineEvents();

    if (this.queue.length >= 10 || FLUSH_NOW.has(eventName)) {
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

  /**
   * Сессия на 40 секунд с нулём действий и такая же с пятью слияниями — разные
   * истории, а по одной длительности неразличимы. Копим счётчики за сессию.
   */
  _bumpSessionCounter(key, by = 1) {
    if (!this.sessionCounters) this.sessionCounters = {};
    this.sessionCounters[key] = (this.sessionCounters[key] || 0) + by;
  }

  trackSessionEnd() {
    const now = Date.now();
    if (now - (this._lastSessionEndAt || 0) < SESSION_END_DEBOUNCE_MS) return;
    this._lastSessionEndAt = now;
    const durationSeconds = Math.floor((now - this.sessionStartTime) / 1000);
    const c = this.sessionCounters || {};
    this.track('session_end', {
      duration_seconds: durationSeconds,
      merges: Number(c.merges || 0),
      buys: Number(c.buys || 0),
      blocked: Number(c.blocked || 0),
      ads_watched: Number(c.ads_watched || 0),
      max_level_reached: Number(c.max_level || 0),
      // Пустая сессия — главный признак «зашёл и сразу вышел»
      idle: !(c.merges || c.buys)
    });
  }

  /**
   * Игрок захотел действие и не смог. Это одновременно триггер монетизации
   * и точка выхода — раньше мы показывали тост и никуда его не писали.
   */
  trackActionBlocked(reason, extra = {}) {
    this._bumpSessionCounter('blocked');
    this.track('action_blocked', {
      reason: String(reason || 'unknown').slice(0, 40),
      ...(extra && typeof extra === 'object' ? extra : {})
    });
  }

  trackShopOpened(source = 'unknown') {
    this.track('shop_opened', { source: String(source).slice(0, 40) });
  }

  /**
   * Пара к iap_purchase_completed: без неё видно только успешные покупки,
   * и непонятно, 13 покупок — это из 15 попыток или из 300.
   */
  trackPurchaseInitiated(pack, votes, rubies) {
    this.track('purchase_initiated', {
      pack: String(pack || '').slice(0, 40),
      votes: Number(votes) || 0,
      rubies: Number(rubies) || 0
    });
  }

  /**
   * Время до первого самостоятельного слияния — лучший предиктор удержания
   * в merge-играх. Пишется один раз за всю жизнь установки.
   */
  trackFirstMerge(wasTutorialSkipped = false) {
    if (typeof localStorage === 'undefined') return;
    const KEY = 'cat_empire_first_merge_done';
    try {
      if (localStorage.getItem(KEY)) return;
      localStorage.setItem(KEY, '1');
    } catch (e) {
      return;
    }
    this.track('first_merge', {
      seconds_since_install: this._secondsSinceInstall(),
      was_tutorial_skipped: Boolean(wasTutorialSkipped)
    });
  }

  _secondsSinceInstall() {
    if (typeof localStorage === 'undefined') return 0;
    try {
      const firstSeen = Number(localStorage.getItem('cat_empire_first_seen_at'));
      if (!firstSeen) return 0;
      return Math.max(0, Math.floor((Date.now() - firstSeen) / 1000));
    } catch (e) {
      return 0;
    }
  }

  trackCatBought(cost, totalCatsBought, coinsBalance) {
    this._bumpSessionCounter('buys');
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
    this._bumpSessionCounter('merges');
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

  trackAdShown(adType, isTestAd = false, extra = {}) {
    this.track('ad_shown', {
      ad_type: adType,
      is_test_ad: Boolean(isTestAd),
      ...(extra && typeof extra === 'object' ? extra : {})
    });
  }

  trackAdCompleted(adType, rewardGems = 5) {
    this._bumpSessionCounter('ads_watched');
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
    const lvl = Number(level) || 0;
    if (!this.sessionCounters) this.sessionCounters = {};
    this.sessionCounters.max_level = Math.max(this.sessionCounters.max_level || 0, lvl);
    this.track('max_cat_level_reached', { level: lvl });
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

  // --- Онбординг и возвраты (TASK-082: диагностика D1/D7) ---

  trackTutorialStarted() {
    this.track('tutorial_started', {});
  }

  trackTutorialCompleted(elapsedMs) {
    this.track('tutorial_completed', {
      elapsed_ms: Number(elapsedMs) || 0
    });
  }

  trackTutorialSkipped(elapsedMs) {
    this.track('tutorial_skipped', {
      elapsed_ms: Number(elapsedMs) || 0
    });
  }

  // Фиксирует день с установки (0 = первый день) на каждый старт сессии,
  // чтобы D1/D7/D30 можно было считать по реальным датам, а не задним числом.
  trackReturnSession() {
    const daysSinceInstall = this._daysSinceInstall();
    this.track('return_session', {
      days_since_install: daysSinceInstall,
      is_first_session: daysSinceInstall === 0
    });
  }

  _daysSinceInstall() {
    if (typeof localStorage === 'undefined') return 0;
    const KEY = 'cat_empire_first_seen_at';
    try {
      let firstSeen = localStorage.getItem(KEY);
      if (!firstSeen) {
        firstSeen = String(Date.now());
        localStorage.setItem(KEY, firstSeen);
        return 0;
      }
      const msPerDay = 24 * 60 * 60 * 1000;
      return Math.floor((Date.now() - Number(firstSeen)) / msPerDay);
    } catch (e) {
      return 0;
    }
  }

  // --- Отправка данных ---

  async flush() {
    // Node-тесты и SSR не должны стучать в прод. global fetch в Node 18+ есть.
    if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
    if (!this.queue.length || this.isFlushing) return false;
    this.isFlushing = true;

    const batch = [...this.queue];

    try {
      const response = await fetch(`${API_BASE}/events/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true
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
