/**
 * Нативная реклама VK Mini Apps: reward / interstitial / banner.
 * На desktop_web формат reward часто отклоняется сразу, поэтому ПК
 * сначала показывает interstitial, затем reward с use_waterfall.
 */

import { isDesktopVK } from '../services/PlatformService.js';

export const NATIVE_AD_TIMEOUT_MS = 20000;

/**
 * Сколько ждать показа, если предпроверка сказала «рекламы нет».
 * Она бывает ложноотрицательной, поэтому show всё равно пробуем — но коротко,
 * чтобы не висеть 20с (на десктопе это было бы 2 формата × 20с = 40с пустого окна).
 */
export const NO_ADS_PROBE_TIMEOUT_MS = 4000;

export function getNativeAdFormatOrder(isDesktop) {
  return isDesktop ? ['interstitial', 'reward'] : ['reward', 'interstitial'];
}

/** Что ответила предпроверка. Больше не приговор — только сигнал ждать меньше. */
export function shouldSkipNativeAd(checkRes) {
  return Boolean(checkRes && checkRes.result === false);
}

/**
 * Лимит запросов у VK общий на приложение, а не на формат: пробовать второй
 * формат после такого отказа бессмысленно и только выжигает квоту дальше.
 */
export function isAdQuotaExhausted(reason) {
  return String(reason || '').toLowerCase().includes('requests limit');
}

export function isAdUserClosed(reason) {
  const s = String(reason || '').toLowerCase();
  return (
    s.includes('ad_closed') ||
    s.includes('closed_early') ||
    s.includes('user_denied') ||
    s.includes('user_cancel') ||
    s.includes('cancelled') ||
    s.includes('canceled')
  );
}

export function extractVkErrorReason(err, fallback = 'VK_AD_FAILED') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err.error_data) {
    return err.error_data.error_reason || err.error_data.error_code || fallback;
  }
  if (err.reason) return err.reason;
  if (err.message) return err.message;
  return fallback;
}

function finishOnce(state, cleanup, resolve, result) {
  if (state.resolved) return;
  state.resolved = true;
  if (typeof cleanup === 'function') cleanup();
  resolve(result);
}

function tryNativeAdFormat(bridge, format) {
  const params = { ad_format: format };
  if (format === 'reward') params.use_waterfall = true;

  return new Promise((resolve) => {
    const state = { resolved: false };
    let timeoutId = null;
    let checkSaidNo = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (typeof bridge.unsubscribe === 'function') {
        bridge.unsubscribe(onVkEvent);
      }
    };

    // check_said_no едет в аналитику: показ ПОСЛЕ отрицательной предпроверки —
    // прямое доказательство, что она ложноотрицательная (TASK-083, гипотеза 1).
    const finish = (result) =>
      finishOnce(state, cleanup, resolve, { ...result, format, check_said_no: checkSaidNo });

    const onVkEvent = (e) => {
      if (!e || !e.detail) return;
      const { type, data } = e.detail;
      if (type === 'VKWebAppShowNativeAdsResult') {
        if (data && (data.result === true || data.success === true)) {
          finish({ success: true });
        } else {
          finish({
            success: false,
            reason: data ? (data.error_reason || 'AD_CLOSED_EARLY') : 'AD_CLOSED'
          });
        }
      } else if (type === 'VKWebAppShowNativeAdsFailed') {
        const errReason = data && data.error_data
          ? (data.error_data.error_reason || `Code ${data.error_data.error_code}`)
          : 'VK_AD_FAILED';
        finish({ success: false, reason: errReason });
      }
    };

    const run = async () => {
      let checkTimer = null;
      try {
        const checkTimeout = new Promise((_, reject) => {
          checkTimer = setTimeout(() => reject(new Error('check timeout')), 2500);
        });
        const checkRes = await Promise.race([
          bridge.send('VKWebAppCheckNativeAds', params),
          checkTimeout
        ]);
        console.log(`🔍 VKWebAppCheckNativeAds [${format}]:`, checkRes);
        if (shouldSkipNativeAd(checkRes)) {
          // Не сдаёмся здесь: раньше show не вызывался вообще, и все отказы
          // были нашими собственными. Пробуем показать, но ждём коротко.
          checkSaidNo = true;
        }
      } catch (checkErr) {
        console.log(`ℹ️ VKWebAppCheckNativeAds [${format}] bypass:`, checkErr);
      } finally {
        if (checkTimer) clearTimeout(checkTimer);
      }

      if (typeof bridge.subscribe === 'function') {
        bridge.subscribe(onVkEvent);
      }

      timeoutId = setTimeout(() => {
        finish({ success: false, reason: checkSaidNo ? 'NO_ADS' : 'TIMEOUT_NO_RESPONSE' });
      }, checkSaidNo ? NO_ADS_PROBE_TIMEOUT_MS : NATIVE_AD_TIMEOUT_MS);

      try {
        const res = await bridge.send('VKWebAppShowNativeAds', params);
        console.log(`🎬 VKWebAppShowNativeAds [${format}] promise:`, res);
        if (res && (res.result === true || res.success === true)) {
          finish({ success: true });
        } else if (res && res.result === false) {
          finish({
            success: false,
            reason: res.error_reason || extractVkErrorReason(res, 'AD_NOT_SHOWN')
          });
        }
      } catch (err) {
        console.warn(`⚠️ VKWebAppShowNativeAds [${format}] error:`, err);
        finish({ success: false, reason: extractVkErrorReason(err, 'PROMISE_REJECT') });
      }
    };

    run();
  });
}

/**
 * Показ рекламы за награду. На ПК VK сначала interstitial, затем reward.
 * Стену / симулятор вызывающая сторона открывает только если success=false
 * и это не закрытие пользователем.
 */
export async function showRewardedAd() {
  if (typeof window === 'undefined' || !window.vkBridge || typeof window.vkBridge.send !== 'function') {
    return { success: false, reason: 'VK_BRIDGE_NOT_FOUND' };
  }

  const desktop = isDesktopVK();
  const order = getNativeAdFormatOrder(desktop);
  console.log(`🎬 VK ads order (${desktop ? 'desktop' : 'mobile'}):`, order.join(' → '));

  let lastFail = { success: false, reason: 'NO_ADS' };
  for (const format of order) {
    const result = await tryNativeAdFormat(window.vkBridge, format);
    if (result && result.success) {
      return result;
    }
    if (result && isAdUserClosed(result.reason)) {
      return result;
    }
    lastFail = result || lastFail;
    // Лимит общий на приложение: второй формат его же и добьёт. Все замеченные
    // «Requests limit reached» приходили на interstitial — первый формат десктопа.
    if (result && isAdQuotaExhausted(result.reason)) {
      break;
    }
  }
  return lastFail;
}

/**
 * Баннер внизу экрана — основной рабочий формат рекламы VK на desktop_web.
 * Не роняет игру, если кабинет рекламы ещё не подключён.
 */
export async function showDesktopBannerAd() {
  if (typeof window === 'undefined' || !window.vkBridge || typeof window.vkBridge.send !== 'function') {
    return { success: false, reason: 'VK_BRIDGE_NOT_FOUND' };
  }
  if (!isDesktopVK()) {
    return { success: false, reason: 'NOT_DESKTOP' };
  }

  try {
    try {
      const check = await window.vkBridge.send('VKWebAppCheckBannerAd');
      console.log('🔍 VKWebAppCheckBannerAd:', check);
      if (check && check.result === false) {
        return { success: false, reason: 'NO_BANNER' };
      }
    } catch (checkErr) {
      console.log('ℹ️ VKWebAppCheckBannerAd bypass:', checkErr);
    }

    const res = await window.vkBridge.send('VKWebAppShowBannerAd', {
      banner_location: 'bottom',
      layout_type: 'resize',
      can_close: true
    });
    console.log('🪧 VKWebAppShowBannerAd:', res);
    return { success: !!(res && res.result), res };
  } catch (err) {
    console.warn('⚠️ VK banner unavailable:', err);
    return { success: false, reason: extractVkErrorReason(err, 'BANNER_FAILED') };
  }
}

export default {
  showRewardedAd,
  showDesktopBannerAd,
  getNativeAdFormatOrder,
  isAdUserClosed,
  shouldSkipNativeAd,
  isAdQuotaExhausted
};
