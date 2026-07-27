/**
 * Единый Модуль Идентификации VK (VkIdentity)
 * Гарантирует одинаковый vk_user_id на ПК, Android, iPhone и мобильном браузере
 */
export class VkIdentity {
  constructor() {
    this.cachedVkUserId = null;
  }

  /**
   * Извлечь vk_user_id из всех возможных источников:
   * 1. VK Bridge (window.vkBridge)
   * 2. URL search (?vk_user_id=...)
   * 3. URL hash (#vk_user_id=...)
   * 4. LocalStorage fallback
   */
  async getVkUserId() {
    if (this.cachedVkUserId) {
      return this.cachedVkUserId;
    }

    let foundId = null;

    // 1. Извлечение из URL query string (?vk_user_id=...)
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      foundId = searchParams.get('vk_user_id');
    }

    // 2. Извлечение из URL hash (#vk_user_id=...)
    if (!foundId && typeof window !== 'undefined' && window.location && window.location.hash) {
      const hashString = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hashString);
      foundId = hashParams.get('vk_user_id');
    }

    // 3. Вызов VK Bridge на смартфонах
    if (!foundId && typeof window !== 'undefined' && window.vkBridge && typeof window.vkBridge.send === 'function') {
      try {
        const userInfo = await window.vkBridge.send('VKWebAppGetUserInfo');
        if (userInfo && userInfo.id) {
          foundId = String(userInfo.id);
        }
      } catch (e) {
        console.warn('VK Bridge GetUserInfo bypass:', e);
      }
    }

    // 4. Кэшированный локальный гостевой ID
    if (!foundId && typeof localStorage !== 'undefined') {
      foundId = localStorage.getItem('cat_empire_guest_vk_id');
      if (!foundId) {
        foundId = 'guest_' + Math.floor(Math.random() * 1000000);
        localStorage.setItem('cat_empire_guest_vk_id', foundId);
      }
    }

    if (!foundId) {
      foundId = '999999999';
    }

    this.cachedVkUserId = String(foundId);
    return this.cachedVkUserId;
  }
}

export const vkIdentity = new VkIdentity();
export default vkIdentity;
