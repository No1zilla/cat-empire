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
    return { success: false, reason: 'VK_BRIDGE_NOT_FOUND' };
  }

  let lastErrorReason = 'NO_REWARDED_AD_AVAILABLE';

  // 1. Нативный вызов VKWebAppShowNativeAds ('reward')
  try {
    const showRes = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
    console.log('🎬 VKWebAppShowNativeAds (reward) result:', showRes);
    if (showRes && (showRes.result === true || showRes.success === true)) {
      return { success: true };
    }
    if (showRes && showRes.error_data) {
      lastErrorReason = showRes.error_data.error_reason || `Code ${showRes.error_data.error_code}`;
    }
  } catch (err) {
    console.warn('⚠️ VKWebAppShowNativeAds reward error:', err);
    if (err && err.error_data) {
      lastErrorReason = err.error_data.error_reason || `Code ${err.error_data.error_code}`;
    } else if (err && err.message) {
      lastErrorReason = err.message;
    }
  }

  // 2. Тестовый показ VKWebAppShowNativeAds с флагом use_test_ads: 1
  try {
    const testRes = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward', use_test_ads: 1 });
    console.log('🧪 VKWebAppShowNativeAds testRes:', testRes);
    if (testRes && (testRes.result === true || testRes.success === true)) {
      return { success: true };
    }
  } catch (err) {
    console.warn('⚠️ VKWebAppShowNativeAds test error:', err);
    if (err && err.error_data && !lastErrorReason) {
      lastErrorReason = err.error_data.error_reason || `Code ${err.error_data.error_code}`;
    }
  }

  // 3. Предварительная проверка VKWebAppCheckNativeAds + VKWebAppShowNativeAds
  try {
    const checkRes = await window.vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' });
    if (checkRes && checkRes.result === true) {
      const showRes2 = await window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
      if (showRes2 && (showRes2.result === true || showRes2.success === true)) {
        return { success: true };
      }
    }
  } catch (err) {}

  return { success: false, reason: lastErrorReason };
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard,
  showRewardedAd
};
