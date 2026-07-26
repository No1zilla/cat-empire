// Модуль API клиента для взаимодействия с бэкенд-сервером через чистый HTTPS тоннель

const BASE_URL = 'https://cat-empire-production.up.railway.app/api';

/**
 * Извлечение параметров запуска VK для заголовка x-vk-sign
 */
function getVkSignHeader() {
  return window.location.search || '';
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
      try {
        await window.vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'rewarded' });
      } catch (e) {}

      const res = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'rewarded' });
      console.log('VKWebAppShowNativeAds response:', res);
      if (res && (res.result === true || res.success === true)) {
        return { success: true };
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
