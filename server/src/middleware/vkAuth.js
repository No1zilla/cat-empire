import { verifyVkSign } from '../utils/vkCheckSign.js';

/**
 * Middleware валидации подписи VK Mini Apps
 */
export function vkAuth(req, res, next) {
  const vkSignHeader = req.headers['x-vk-sign'] || req.headers['authorization'] || '';
  const queryString = vkSignHeader || req.originalUrl.split('?')[1] || '';

  // В режиме разработки fallback на mock vkId при отсутствии подписи
  const isDev = (process.env.NODE_ENV || 'development') === 'development';

  if (!queryString || queryString.trim() === '') {
    if (isDev) {
      req.vkUserId = 123456n;
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Missing VK launch parameters' });
  }

  // Извлечение vk_user_id из параметров
  const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
  const vkUserIdStr = params.get('vk_user_id');

  // Валидация подписи (если у нас задан секрет приложения, проверяем подпись; иначе в dev-режиме пропускаем)
  const clientSecret = process.env.VK_APP_SECRET || '';
  const isValid = verifyVkSign(queryString, clientSecret);

  if (!isValid && !isDev) {
    return res.status(401).json({ error: 'Unauthorized: Invalid VK signature' });
  }

  // Присвоение vkUserId
  try {
    const rawId = vkUserIdStr || (isDev ? '123456' : null);
    if (!rawId) {
      return res.status(401).json({ error: 'Unauthorized: Missing vk_user_id' });
    }
    req.vkUserId = BigInt(rawId);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid vk_user_id format' });
  }
}

export default vkAuth;
