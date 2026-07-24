// Модуль API клиента для взаимодействия с бэкенд-сервером через HTTPS

const BASE_URL = 'https://olive-carpets-cheat.loca.lt/api';

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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Ошибка ${response.status}`);
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[API] Ошибка запроса к ${endpoint}:`, err.message);
    throw err;
  }
}

/**
 * Получение профиля пользователя
 */
export async function fetchProfile() {
  return apiRequest('/user/profile', { method: 'GET' });
}

/**
 * Сохранение игрового прогресса
 */
export async function saveProgress(data) {
  return apiRequest('/user/save', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Получение таблицы лидеров
 */
export async function fetchLeaderboard() {
  return apiRequest('/leaderboard', { method: 'GET' });
}

export default {
  fetchProfile,
  saveProgress,
  fetchLeaderboard
};
