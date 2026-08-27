// Модуль API клиента для взаимодействия с бэкенд-сервером через чистый HTTPS тоннель
import bridge from '@vkontakte/vk-bridge';
import { showRewardedAd, showDesktopBannerAd } from './vkAds.js';
export { showRewardedAd, showDesktopBannerAd };

// TASK-097: диагностика доступности бэкенда независимо от самого бэкенда — событие
// уходит через инфраструктуру VK (VKWebAppTrackEvent), а не через Railway, поэтому
// доходит до статистики VK, даже если сеть до Railway у игрока не работает.
// Смотреть в статистике самого VK Mini App, не в нашей БД — иначе замкнутый круг.
let reportedReachableThisSession = false;
function trackAccessEvent(eventName) {
  try {
    bridge.send('VKWebAppTrackEvent', { event_name: eventName }).catch(() => {});
  } catch (e) {
    // Телеметрия не должна ронять игру
  }
}

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

/**
 * TASK-113: initData Telegram — подписанная строка запуска. Сервер проверяет её
 * HMAC-ом бота, поэтому подделать идентификатор игрока с клиента нельзя.
 * Читаем напрямую из SDK: она обновляется самим клиентом Telegram, кэшировать
 * её (как параметры VK) нельзя — протухшая initData отклоняется сервером.
 */
export function getTelegramInitData() {
  if (typeof window === 'undefined') return '';
  const app = window.Telegram && window.Telegram.WebApp;
  return (app && app.initData) || '';
}

function requestHeaders(options = {}, withSign = true) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (withSign) {
    const initData = getTelegramInitData();
    if (initData) {
      headers['x-telegram-init-data'] = initData;
    } else {
      const sign = getVkSignHeader();
      if (sign) headers['x-vk-sign'] = sign;
    }
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
    let response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders(options, withSign),
        credentials: 'omit',
        signal: controller.signal
      });
    } catch (netErr) {
      // fetch() бросил — соединение не установилось вообще (не путать с HTTP-ошибкой ниже)
      trackAccessEvent('backend_api_unreachable');
      throw netErr;
    }
    // Любой HTTP-ответ, даже не ok, доказывает, что сеть до Railway работает
    if (!reportedReachableThisSession) {
      reportedReachableThisSession = true;
      trackAccessEvent('backend_api_reachable');
    }
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
/**
 * TASK-114: ссылка на оплату звёздами. Сумму и товар определяет сервер по
 * идентификатору — клиент не может ни назначить цену, ни выбрать, что получит.
 */
export async function createStarsInvoice(itemId) {
  try {
    const res = await apiRequest('/stars/invoice', {
      method: 'POST',
      body: JSON.stringify({ itemId })
    });
    return res && res.link ? res : null;
  } catch (e) {
    console.warn('Не удалось получить ссылку на оплату:', e);
    return null;
  }
}

/**
 * TASK-115: засчитать приглашение. Кто пришёл — сервер решает по подписи initData,
 * из тела берётся только идентификатор пригласившего.
 */
export async function claimReferral(ref) {
  try {
    return await apiRequest('/referral/claim', {
      method: 'POST',
      body: JSON.stringify({ ref })
    });
  } catch (e) {
    return null;
  }
}

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
