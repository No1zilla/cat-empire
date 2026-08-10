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

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (typeof window.vkBridge.unsubscribe === 'function') {
        window.vkBridge.unsubscribe(onVkEvent);
      }
    };

    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    const onVkEvent = (e) => {
      if (!e || !e.detail) return;
      const { type, data } = e.detail;
      console.log('📡 VK Ad Subscriber Event:', type, data);
      if (type === 'VKWebAppShowNativeAdsResult') {
        if (data && (data.result === true || data.success === true)) {
          finish({ success: true });
        } else {
          finish({ success: false, reason: data ? (data.error_reason || 'AD_CLOSED_EARLY') : 'AD_CLOSED' });
        }
      } else if (type === 'VKWebAppShowNativeAdsFailed') {
        const errReason = data && data.error_data ? (data.error_data.error_reason || `Code ${data.error_data.error_code}`) : 'VK_AD_FAILED';
        finish({ success: false, reason: errReason });
      }
    };

    if (typeof window.vkBridge.subscribe === 'function') {
      window.vkBridge.subscribe(onVkEvent);
    }

    // Отправка запроса нативной КОММЕРЧЕСКОЙ рекламы VKWebAppShowNativeAds ('reward')
    window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
      .then((res) => {
        console.log('🎬 VKWebAppShowNativeAds send promise res:', res);
        if (res && (res.result === true || res.success === true)) {
          finish({ success: true });
        }
      })
      .catch((err) => {
        console.warn('⚠️ VKWebAppShowNativeAds send promise err:', err);
        const errReason = err && err.error_data ? (err.error_data.error_reason || `Code ${err.error_data.error_code}`) : (err ? err.message : 'PROMISE_REJECT');
        finish({ success: false, reason: errReason });
      });

    // Тайм-аут предохранитель на 45 секунд
    setTimeout(() => {
      finish({ success: false, reason: 'TIMEOUT_NO_RESPONSE' });
    }, 45000);
  });
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard,
  showRewardedAd
};
