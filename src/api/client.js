// Модуль API клиента для взаимодействия с бэкенд-сервером через чистый HTTPS тоннель

const BASE_URL = (typeof window !== 'undefined' && window.location.origin.includes('vercel.app'))
  ? '/api'
  : 'https://cat-empire-production.up.railway.app/api';

/**
 * Извлечение параметров запуска VK для заголовка x-vk-sign (с закэшированным сохранениям)
 */
function getVkSignHeader() {
  if (typeof window === 'undefined') return '';
  let str = window.location.search || window.location.hash || '';

  if (str && str.includes('vk_user_id')) {
    try {
      localStorage.setItem('cat_empire_vk_launch_params', str);
    } catch (e) {}
  } else {
    try {
      str = localStorage.getItem('cat_empire_vk_launch_params') || str;
    } catch (e) {}
  }

  // Если параметров запуска нет, используем сохранённый vk_user_id
  if (!str || !str.includes('vk_user_id')) {
    try {
      const savedUserId = localStorage.getItem('cat_empire_vk_user_id');
      if (savedUserId) {
        str = `vk_user_id=${savedUserId}`;
      }
    } catch (e) {}
  }

  // Вычищаем '#' и '?' для 100% гарантированной совместимости с HTTP-заголовками Nginx/Railway
  while (str.startsWith('?') || str.startsWith('#')) {
    str = str.slice(1);
  }

  return str;
}

/**
 * Базовый метод для отправки HTTP запросов с тайм-аутом 3 секунды
 */
async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-vk-sign': getVkSignHeader(),
      ...(options.headers || {})
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    return null; // При любых сетевых проблемах оффлайн режим
  }
}

/**
 * Получение профиля пользователя
 */
export async function fetchProfile() {
  try {
    const data = await apiRequest('/user/profile', { method: 'GET' });
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Сохранение игрового прогресса
 */
export async function saveProgress(data) {
  try {
    return await apiRequest('/user/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (e) {
    return null;
  }
}

/**
 * Получение таблицы лидеров
 */
export async function fetchLeaderboard() {
  try {
    return await apiRequest('/leaderboard', { method: 'GET' });
  } catch (e) {
    return { leaderboard: [] };
  }
}

export async function showRewardedAd() {
  if (typeof window === 'undefined' || !window.vkBridge || typeof window.vkBridge.send !== 'function') {
    return { success: false, reason: 'NO_VK_BRIDGE' };
  }

  const callWithTimeout = (promise, ms = 1500) => {
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ result: false, timeout: true }), ms));
    return Promise.race([promise, timeout]);
  };

  // 1. Попытка через VKWebAppCheckNativeAds + VKWebAppShowNativeAds ('reward')
  try {
    const checkRewarded = await callWithTimeout(window.vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' }), 1500).catch(() => null);
    console.log('🔍 VKWebAppCheckNativeAds (reward):', checkRewarded);

    if (checkRewarded && checkRewarded.result === true) {
      const res = await callWithTimeout(window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' }), 60000).catch(() => null);
      console.log('🎬 VKWebAppShowNativeAds (reward) result:', res);
      if (res && (res.result === true || res.success === true)) {
        return { success: true };
      }
    }
  } catch (e) {
    console.warn('⚠️ VK Rewarded format error:', e);
  }

  // 2. Попытка через Interstitial ('interstitial')
  try {
    const checkInt = await callWithTimeout(window.vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'interstitial' }), 1500).catch(() => null);
    console.log('🔍 VKWebAppCheckNativeAds (interstitial):', checkInt);

    if (checkInt && checkInt.result === true) {
      const res2 = await callWithTimeout(window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' }), 60000).catch(() => null);
      console.log('🎬 VKWebAppShowNativeAds (interstitial) result:', res2);
      if (res2 && (res2.result === true || res2.success === true)) {
        return { success: true };
      }
    }
  } catch (e) {
    console.warn('⚠️ VK Interstitial error:', e);
  }

  // 3. Прямой вызов VKWebAppShowNativeAds с тайм-аутом 1.5с
  try {
    const directRes = await callWithTimeout(window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' }), 1500).catch(() => null);
    console.log('🎬 Direct VKWebAppShowNativeAds result:', directRes);
    if (directRes && (directRes.result === true || directRes.success === true)) {
      return { success: true };
    }
  } catch (e) {}

  return { success: false, reason: 'NO_AD_AVAILABLE' };
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard,
  showRewardedAd
};
