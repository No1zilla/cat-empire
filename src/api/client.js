// Модуль API клиента для взаимодействия с бэкенд-сервером через чистый HTTPS тоннель
import { showRewardedAd, showDesktopBannerAd } from './vkAds.js';
export { showRewardedAd, showDesktopBannerAd };

function resolveApiBase() {
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

const BASE_URL = resolveApiBase();

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
 * Базовый метод для отправки HTTP запросов с тайм-аутом 8 секунд
 */
async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) || 8000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const { timeoutMs: _ignored, ...fetchOptions } = options;

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-vk-sign': getVkSignHeader(),
      ...(options.headers || {})
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
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
 * Сохранение игрового прогресса (100% совместимость с PostgreSQL бэкендом: camelCase + snake_case)
 */
export async function saveProgress(data) {
  if (!data) return null;
  try {
    const payload = {
      coins: data.coins,
      gems: data.gems,
      maxCatLevel: data.maxCatLevel,
      max_cat_level: data.maxCatLevel,
      totalCatsBought: data.totalCatsBought,
      total_cats_bought: data.totalCatsBought,
      totalMerges: data.totalMerges,
      total_merges: data.totalMerges,
      gridState: data.gridState,
      grid_state: data.gridState,
      updatedAt: data.updatedAt || Date.now(),
      updated_at: new Date(data.updatedAt || Date.now()).toISOString(),
      isReset: data.isReset || false,
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      first_name: data.firstName,
      last_name: data.lastName
    };
    return await apiRequest('/user/save', {
      method: 'POST',
      body: JSON.stringify(payload)
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
    return await apiRequest('/leaderboard', { method: 'GET', timeoutMs: 10000 });
  } catch (e) {
    return null;
  }
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard,
  showRewardedAd
};
