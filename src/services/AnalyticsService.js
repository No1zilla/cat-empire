/**
 * AnalyticsService — Подсистема сквозного продуктового трекинга (AppMetrica & myTracker)
 * Рассчитывает когорты Retention D1/D3/D7, отслеживает просмотры рекламы и слияния котиков.
 */

class AnalyticsServiceManager {
  constructor() {
    this._appMetricaKey = null;
    this._myTrackerKey = null;
    this._initialized = false;
    this._userFirstLaunch = null;
  }

  /**
   * Инициализация трекеров аналитики
   * @param {Object} config - ключи AppMetrica и myTracker
   */
  init(config = {}) {
    if (this._initialized) return;
    this._initialized = true;

    this._appMetricaKey = config.appMetricaKey || 'CAT_EMPIRE_APPMETRICA_KEY';
    this._myTrackerKey = config.myTrackerKey || 'CAT_EMPIRE_MYTRACKER_KEY';

    this._initFirstLaunchAndRetention();
    this._injectWebSdkScripts();

    console.log('📊 [AnalyticsService] Инициализирован трекинг когорт и Retention.');
  }

  /**
   * Расчет дней удержания (Retention Day 1, Day 3, Day 7)
   */
  _initFirstLaunchAndRetention() {
    try {
      let firstLaunch = localStorage.getItem('cat_empire_first_launch');
      const now = Date.now();

      if (!firstLaunch) {
        firstLaunch = String(now);
        localStorage.setItem('cat_empire_first_launch', firstLaunch);
        this.trackEvent('user_registration', { timestamp: now });
      }

      this._userFirstLaunch = parseInt(firstLaunch, 10);
      const daysDiff = Math.floor((now - this._userFirstLaunch) / (1000 * 60 * 60 * 24));

      this.trackSessionStart(daysDiff);
    } catch (e) {
      console.warn('📊 [AnalyticsService] Ошибка расчета Retention:', e);
    }
  }

  /**
   * Безопасная внедрение веберных SDK (AppMetrica / myTracker)
   */
  _injectWebSdkScripts() {
    try {
      // Инициализация Yandex AppMetrica / Metrika JS counter
      if (!window.ym) {
        (function (m, e, t, r, i, k, a) {
          m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
          m[i].l = 1 * new Date();
          for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
          k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a);
        })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        // Резервный счётчик метрики
        window.ym(99999999, "init", {
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true
        });
      }
    } catch (e) {
      console.warn('📊 [AnalyticsService] Ошибка подключения скрипта трекера:', e);
    }
  }

  /**
   * Отправка произвольного события
   */
  trackEvent(eventName, params = {}) {
    try {
      console.log(`📊 [Analytics] ${eventName}:`, params);

      // AppMetrica / Yandex Metrika Event
      if (typeof window.ym === 'function') {
        window.ym(99999999, 'reachGoal', eventName, params);
      }

      // myTracker Event
      if (window.myTracker && typeof window.myTracker.trackEvent === 'function') {
        window.myTracker.trackEvent(eventName, params);
      }

      // VK Bridge Analytics
      if (window.vkBridge && typeof window.vkBridge.send === 'function') {
        window.vkBridge.send('VKWebAppTrackEvent', {
          event_name: eventName,
          event_data: params
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('📊 [AnalyticsService] Ошибка отправки события:', e);
    }
  }

  /**
   * Запуск сессии и трекинг retention по дням
   */
  trackSessionStart(dayNumber = 0) {
    this.trackEvent('session_start', {
      retention_day: dayNumber,
      is_day1: dayNumber === 1,
      is_day3: dayNumber === 3,
      is_day7: dayNumber === 7
    });
  }

  /**
   * Отслеживание события слияния котиков
   */
  trackCatMerged(level, catName = '') {
    this.trackEvent('cat_merged', {
      level: Number(level),
      cat_name: catName
    });
  }

  /**
   * Отслеживание просмотра рекламы (Rewarded Ad)
   */
  trackAdWatched(placement = 'automerge', rewardGems = 0) {
    this.trackEvent('ad_watched', {
      placement,
      reward_gems: Number(rewardGems)
    });
  }

  /**
   * Отслеживание расхода премиум-валюты (Гемов)
   */
  trackGemsSpent(amount, item = 'automerge') {
    this.trackEvent('gems_spent', {
      amount: Number(amount),
      item
    });
  }

  /**
   * Открытие нового уровня котика
   */
  trackCatUnlocked(level, catName = '') {
    this.trackEvent('new_cat_unlocked', {
      level: Number(level),
      cat_name: catName
    });
  }
}

export const AnalyticsService = new AnalyticsServiceManager();
export default AnalyticsService;
