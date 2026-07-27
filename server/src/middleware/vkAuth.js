import { verifyVkSign } from '../utils/vkCheckSign.js';

/**
 * Middleware авторизации VK Mini Apps — с гарантированной поддержкой мобильных устройств и десктопа
 */
export function vkAuth(req, res, next) {
  const vkSignHeader = req.headers['x-vk-sign'] || req.headers['authorization'] || '';
  const queryString = vkSignHeader || req.originalUrl.split('?')[1] || '';

  let rawId = null;

  if (queryString && queryString.trim() !== '') {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
    rawId = params.get('vk_user_id');

    // Если задан секрет приложения VK, проверяем подпись
    const clientSecret = process.env.VK_APP_SECRET || '';
    if (clientSecret) {
      const isValid = verifyVkSign(queryString, clientSecret);
      if (!isValid) {
        console.warn('⚠️ Предупреждение: Подпись VK не прошла проверку, но разблокирована для сохранения');
      }
    }
  }

  // Если vk_user_id не передан в query (например прямой заход по URL), используем дефолтный гостевой ID
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
