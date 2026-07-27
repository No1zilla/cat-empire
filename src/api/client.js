// Модуль API клиента для взаимодействия с бэкенд-сервером через чистый HTTPS тоннель

const BASE_URL = (typeof window !== 'undefined' && window.location.origin.includes('vercel.app'))
  ? '/api'
  : 'https://cat-empire-production.up.railway.app/api';

/**
 * Извлечение параметров запуска VK для заголовка x-vk-sign
 */
function getVkSignHeader() {
  if (typeof window === 'undefined') return '';
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  if (search && search.includes('vk_user_id')) return search;
  if (hash && hash.includes('vk_user_id')) return hash;

  return search || hash || '';
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
  try {
    if (window.vkBridge && typeof window.vkBridge.send === 'function') {
      // 1. Пробуем Rewarded Видео
      try {
        const res = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'rewarded' });
        console.log('VK Rewarded result:', res);
        if (res && (res.result === true || res.success === true)) {
          return { success: true };
        }
      } catch (e1) {
        console.warn('VK Rewarded format not supported, trying Interstitial:', e1);
      }

      // 2. Запасной нативный формат Interstitial (работает в Десктоп VK Web)
      try {
        const res2 = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' });
        console.log('VK Interstitial result:', res2);
        if (res2 && (res2.result === true || res2.success === true)) {
          return { success: true };
        }
      } catch (e2) {
        console.warn('VK Interstitial error:', e2);
      }
    }
  } catch (err) {
    console.error('VK Rewarded Ads error:', err);
    return { success: false, error: err };
  }
  return { success: false, error: 'Ads not shown' };
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard,
  showRewardedAd
};
