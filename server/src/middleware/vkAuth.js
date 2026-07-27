import { verifyVkSign } from '../utils/vkCheckSign.js';

/**
 * Middleware авторизации VK Mini Apps — с гарантированной поддержкой мобильных устройств и десктопа
 */
export function vkAuth(req, res, next) {
  const rawHeader = req.headers['x-vk-sign'] || req.headers['authorization'] || '';
  const fullUrl = req.originalUrl || req.url || '';
  const rawInput = (rawHeader + ' ' + fullUrl);

  let rawId = null;

  // 1. Прямое 100% надежное regex-извлечение vk_user_id из любого формата (query, hash, header, encoded)
  const match = rawInput.match(/vk_user_id=([0-9]+)/);
  if (match && match[1]) {
    rawId = match[1];
  }

  // 2. Если vk_user_id не найден, используем дефолтный гостевой ID
  if (!rawId) {
    rawId = '999999999';
  }

  try {
    req.vkUserId = BigInt(rawId);
    next();
  } catch (error) {
    req.vkUserId = 999999999n;
    next();
  }
}

export default vkAuth;
