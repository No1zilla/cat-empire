// Модуль API клиента для взаимодействия с бэкенд-сервером

const BASE_URL = 'http://localhost:3001/api';

/**
 * Извлечение параметров запуска VK для заголовка x-vk-sign
 */
function getVkSignHeader() {
  return window.location.search || '';
}

/**
 * Базовый метод для отправки HTTP запросов с заголовком аутентификации VK
 */
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-vk-sign': getVkSignHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP Ошибка ${response.status}`);
  }

  return response.json();
}

/**
 * Получение профиля пользователя (с авто-созданием и оффлайн-доходом)
 */
export async function fetchProfile() {
  return apiRequest('/user/profile', { method: 'GET' });
}

/**
 * Сохранение игрового прогресса (монеты, гемы, уровень, сетка)
 * @param {object} data - { coins, gems, maxCatLevel, gridState }
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
