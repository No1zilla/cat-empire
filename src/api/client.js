// Модуль API клиента для взаимодействия с бэкенд-сервером через HTTPS

const BASE_URL = 'https://rude-spiders-learn.loca.lt/api';

/**
 * Извлечение параметров запуска VK для заголовка x-vk-sign
 */
function getVkSignHeader() {
  return window.location.search || '';
}

/**
 * Базовый метод для отправки HTTP запросов с тайм-аутом 2 секунды
 */
async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-vk-sign': getVkSignHeader(),
      'Bypass-Tunnel-Reminder': 'true',
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
    return null; // При любых проблемах с сетью возвращаем null для оффлайн режима
  }
}

/**
 * Получение профиля пользователя с безопасным фолбеком
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
 * Сохранение игрового прогресса с безопасным фолбеком
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

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard
};
