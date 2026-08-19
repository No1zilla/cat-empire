// Модуль API клиента для взаимодействия с бэкенд-сервером через чистый HTTPS тоннель
import { showRewardedAd, showDesktopBannerAd } from './vkAds.js';
export { showRewardedAd, showDesktopBannerAd };

export const RAILWAY_API = 'https://cat-empire-production.up.railway.app/api';

export function resolveApiBase(origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const o = String(origin || '');
  if (
    o.includes('railway.app') ||
    o.includes('localhost') ||
    o.includes('127.0.0.1') ||
    o.includes('vercel.app')
  ) {
    return '/api';
  }
  return RAILWAY_API;
}

export function sanitizeVkSignHeader(raw) {
  let s = String(raw || '');
  s = s.replace(/^[?#/]+/, '');
  s = s.replace(/#/g, '&');
  s = s.replace(/[^\x20-\x7E]/g, '');
  if (s.length > 3500) s = s.slice(0, 3500);
  return s.trim();
}

export function vkUserIdFromLaunch(raw) {
  const match = String(raw || '').match(/vk_user_id=([0-9]+)/);
  return match ? match[1] : '';
}

export function isLeaderboardPayload(data) {
  return !!(data && Array.isArray(data.leaderboard));
}

export function leaderboardRequestUrls(base = resolveApiBase(), vkId = '') {
  const qs = vkId ? `?vk_user_id=${encodeURIComponent(vkId)}` : '';
  const prefix = String(base || RAILWAY_API).replace(/\/$/, '');
  const urls = [`${prefix}/leaderboard${qs}`];
  const abs = `${RAILWAY_API}/leaderboard${qs}`;
  if (!urls.includes(abs)) urls.push(abs);
  return urls;
}

/**
 * Извлечение параметров запуска VK для заголовка x-vk-sign (с закэшированным сохранениям)
 */
export function getVkSignHeader() {
  if (typeof window === 'undefined') return '';
  let str = '';
  if (window.location) {
    str = `${window.location.search || ''}&${window.location.hash || ''}`;
  }

  if (str && str.includes('vk_user_id')) {
    try {
      localStorage.setItem('cat_empire_vk_launch_params', str);
    } catch (e) {}
  } else {
    try {
      str = `${str}&${localStorage.getItem('cat_empire_vk_launch_params') || ''}`;
    } catch (e) {}
  }

  if (!str.includes('vk_user_id')) {
    try {
      const savedUserId = localStorage.getItem('cat_empire_vk_user_id');
      if (savedUserId) {
        str = `${str}&vk_user_id=${savedUserId}`;
      }
    } catch (e) {}
  }

  return sanitizeVkSignHeader(str);
}

function requestHeaders(options = {}, withSign = true) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (withSign) {
    const sign = getVkSignHeader();
    if (sign) headers['x-vk-sign'] = sign;
  }
  return headers;
}

/**
 * Базовый метод для отправки HTTP запросов с тайм-аутом 8 секунд
 */
async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) || 8000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const { timeoutMs: _ignored, ...fetchOptions } = options;
  const url = `${resolveApiBase()}${endpoint}`;

  const attempt = async (withSign) => {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders(options, withSign),
      credentials: 'omit',
      signal: controller.signal
    });
    if (!response.ok) return null;
    return await response.json();
  };

  try {
    const data = await attempt(true);
    if (data) {
      clearTimeout(timeoutId);
      return data;
    }
    const retry = await attempt(false);
    clearTimeout(timeoutId);
    return retry;
  } catch (err) {
    try {
      const retry = await attempt(false);
      clearTimeout(timeoutId);
      return retry;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }
}

async function getJsonSimple(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    clearTimeout(timeoutId);
    return null;
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
      is_reset: data.isReset || false,
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
  const vkId = vkUserIdFromLaunch(getVkSignHeader());
  const urls = leaderboardRequestUrls(resolveApiBase(), vkId);
  for (const url of urls) {
    const data = await getJsonSimple(url, 10000);
    if (isLeaderboardPayload(data)) return data;
  }
  return null;
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard,
  showRewardedAd
};
