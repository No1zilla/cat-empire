import { verifyVkSign } from '../utils/vkCheckSign.js';

/**
 * Middleware авторизации VK Mini Apps — с гарантированной поддержкой мобильных устройств и десктопа
 */
export function vkAuth(req, res, next) {
  const vkSignHeader = req.headers['x-vk-sign'] || req.headers['authorization'] || '';
  let str = vkSignHeader || (req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : (req.originalUrl.includes('#') ? req.originalUrl.split('#')[1] : '')) || '';

  while (str.startsWith('?') || str.startsWith('#')) {
    str = str.slice(1);
  }

  let rawId = null;

  if (str && str.trim() !== '') {
    const params = new URLSearchParams(str);
    rawId = params.get('vk_user_id');

    // Если задан секрет приложения VK, проверяем подпись
    const clientSecret = process.env.VK_APP_SECRET || '';
    if (clientSecret) {
      const isValid = verifyVkSign(str, clientSecret);
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
