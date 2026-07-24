import crypto from 'node:crypto';

/**
 * Валидация подписи параметров запуска VK Mini Apps (HMAC SHA256)
 * @param {string|object} queryInput Строка query параметров (начинается с vk_user_id=...) или объект параметров
 * @param {string} clientSecret Секретный ключ приложения (VK_APP_SECRET)
 * @returns {boolean} true если подпись валидна, иначе false
 */
export function verifyVkSign(queryInput, clientSecret) {
  if (!queryInput || !clientSecret) {
    return false;
  }

  let searchParams;
  let targetSign = '';

  if (typeof queryInput === 'string') {
    // Удаляем ведущий знак '?' если есть
    const queryString = queryInput.startsWith('?') ? queryInput.slice(1) : queryInput;
    searchParams = new URLSearchParams(queryString);
    targetSign = searchParams.get('sign') || '';
  } else if (typeof queryInput === 'object') {
    searchParams = new URLSearchParams();
    targetSign = queryInput.sign || '';
    Object.keys(queryInput).forEach((key) => {
      searchParams.set(key, queryInput[key]);
    });
  } else {
    return false;
  }

  if (!targetSign) {
    return false;
  }

  // Отобрать все параметры с префиксом vk_ и отсортировать по алфавиту
  const vkParams = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith('vk_')) {
      vkParams.push({ key, value });
    }
  });

  vkParams.sort((a, b) => a.key.localeCompare(b.key));

  // Сформировать строку вида vk_param1=val1&vk_param2=val2...
  const formattedQuery = vkParams
    .map((item) => `${item.key}=${encodeURIComponent(item.value)}`)
    .join('&');

  // Вычислить HMAC SHA256
  const hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(formattedQuery);
  const hashBase64 = hmac.digest('base64');

  // Перевести в base64url формат
  const calculatedSign = hashBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$|\s+$/g, '');

  // Сравнение подписи
  return calculatedSign === targetSign || hashBase64 === targetSign;
}

export default verifyVkSign;
