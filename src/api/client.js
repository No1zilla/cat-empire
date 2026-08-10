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

  // 1. Обязательная инициализация и предзагрузка VK Ads через VKWebAppCheckNativeAds ('reward')
  try {
    const checkRes = await window.vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' }).catch((err) => {
      console.warn('⚠️ VKWebAppCheckNativeAds reward check fail:', err);
      return null;
    });
    console.log('🔍 VKWebAppCheckNativeAds (reward):', checkRes);

    if (checkRes && checkRes.result === true) {
      const showRes = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' }).catch((err) => {
        console.warn('⚠️ VKWebAppShowNativeAds reward show fail:', err);
        return null;
      });
      console.log('🎬 VKWebAppShowNativeAds (reward) result:', showRes);
      if (showRes && (showRes.result === true || showRes.success === true)) {
        return { success: true };
      }
    }
  } catch (e) {
    console.warn('⚠️ VK Rewarded flow error:', e);
  }

  // 2. Прямой вызов VKWebAppShowNativeAds ('reward') без предварительной проверки
  try {
    const directRes = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' }).catch(() => null);
    console.log('🎬 Direct VKWebAppShowNativeAds (reward) result:', directRes);
    if (directRes && (directRes.result === true || directRes.success === true)) {
      return { success: true };
    }
  } catch (e) {}

  // 3. Фолбэк на interstitial, если в сети VK Ads в данный момент закончился инвентарь 'reward'
  try {
    const checkInt = await window.vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'interstitial' }).catch(() => null);
    if (checkInt && checkInt.result === true) {
      const showInt = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' }).catch(() => null);
      if (showInt && (showInt.result === true || showInt.success === true)) {
        return { success: true };
      }
    }
  } catch (e) {}

  return { success: false, reason: 'NO_REWARDED_AD_AVAILABLE' };
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard,
  showRewardedAd
};
