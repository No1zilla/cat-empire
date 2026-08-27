/**
 * Выбор платформы (TASK-110).
 *
 * Решение принимается один раз за запуск и кэшируется: игра не должна на середине
 * сессии передумать, где она работает.
 *
 * Порядок проверок важен. Сначала сборочный флаг `__PLATFORM__` — он задан явно и
 * его ни с чем не спутать. Дальше рантайм-детект: одна и та же сборка может
 * открыться и в клиенте, и в обычном браузере (например, по прямой ссылке на
 * GitHub Pages), а игра обязана работать в обоих случаях — просто без кассы.
 */
import { Platform } from './Platform.js';
import { VkPlatform } from './VkPlatform.js';
import { TelegramPlatform } from './TelegramPlatform.js';

let current = null;

/** Есть ли вокруг живой Telegram WebApp. */
export function detectTelegram() {
  if (typeof window === 'undefined') return false;
  const app = window.Telegram && window.Telegram.WebApp;
  return Boolean(app && app.initData !== undefined);
}

/** Есть ли признаки запуска внутри VK. */
export function detectVk() {
  if (typeof window === 'undefined') return false;
  if (window.vkBridge) return true;
  try {
    const str = `${window.location.search || ''}${window.location.hash || ''}`;
    return str.includes('vk_platform') || str.includes('vk_app_id');
  } catch (e) {
    return false;
  }
}

/** Имя платформы для этого запуска, без создания объекта. */
export function resolvePlatformId() {
  const built = typeof __PLATFORM__ !== 'undefined' ? String(__PLATFORM__) : '';
  if (built === 'telegram') return 'telegram';
  if (built === 'vk') return 'vk';

  if (detectTelegram()) return 'telegram';
  if (detectVk()) return 'vk';

  // Сборка под Android (Capacitor) и голый браузер: VK-мостов нет, но игра
  // должна открыться и играться локально.
  return built === 'android' ? 'standalone' : 'vk';
}

export function createPlatform(id = resolvePlatformId()) {
  if (id === 'telegram') return new TelegramPlatform();
  if (id === 'vk') return new VkPlatform();
  return new Platform();
}

/** Платформа этого запуска. Один объект на всю сессию. */
export function getPlatform() {
  if (!current) current = createPlatform();
  return current;
}

/** Только для тестов: подменить или сбросить платформу. */
export function setPlatform(platform) {
  current = platform || null;
  return current;
}

export { Platform, VkPlatform, TelegramPlatform };
export default getPlatform;
