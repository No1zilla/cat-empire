import bridge from '@vkontakte/vk-bridge';
import { eventTracker } from '../analytics/EventTracker.js';

export const VK_APP_ID = 54702054;
export const VK_APP_LINK = `https://vk.com/app${VK_APP_ID}`;

if (typeof window !== 'undefined') {
  window.vkBridge = bridge;
}

export function isVkEnvironment() {
  if (typeof window === 'undefined') return false;
  const urlStr = window.location.search + window.location.hash;
  if (urlStr.includes('vk_user_id') || urlStr.includes('vk_app_id') || urlStr.includes('vk_platform')) {
    return true;
  }
  try {
    if (localStorage.getItem('cat_empire_vk_user_id') || localStorage.getItem('cat_empire_vk_launch_params')) {
      return true;
    }
  } catch (e) {}
  if (window.self !== window.top) {
    return true;
  }
  return false;
}

export function isVkUserCancel(error) {
  if (!error) return false;
  if (error.error_type === 'client_error' || error.error_code === 4) return true;
  const reason = String(
    (error.error_data && (error.error_data.error_reason || error.error_data.error_msg)) ||
    error.error_reason ||
    error.message ||
    ''
  ).toLowerCase();
  return reason.includes('cancel') || reason.includes('denied') || reason.includes('user deny');
}

export function wallPostMessage(message) {
  const stripped = String(message || '')
    .replace(/https?:\/\/(?:m\.)?vk\.(?:com|ru)\/app\d+\S*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || 'Моя Империя Котиков растёт. Заходи поиграть.';
}

// Класс VKService для взаимодействия с VK Mini Apps SDK
export class VKService {
  constructor() {
    this.bridge = bridge;
  }

  // Инициализация VK Bridge
  async init() {
    try {
      if (this.bridge && typeof this.bridge.subscribe === 'function') {
        this.bridge.subscribe((e) => {
          if (!e || !e.detail) return;
          const { type, data } = e.detail;
          if (type === 'VKWebAppShowNativeAdsResult') {
            console.log('🎬 VK Native Ad Event Result:', data);
          } else if (type === 'VKWebAppShowNativeAdsFailed') {
            console.warn('⚠️ VK Native Ad Event Failed:', data);
          }
        });
      }

      const timeoutMs = isVkEnvironment() ? 5000 : 400;
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const result = await Promise.race([this.bridge.send('VKWebAppInit'), timeout]);
      console.log('VKWebAppInit result:', result);
      return result;
    } catch (error) {
      console.error('VKWebAppInit error:', error);
      return null;
    }
  }

  // Получение данных пользователя
  async getUserInfo() {
    try {
      const timeoutMs = isVkEnvironment() ? 5000 : 400;
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const user = await Promise.race([this.bridge.send('VKWebAppGetUserInfo'), timeout]);
      if (user && user.id) {
        return {
          id: user.id,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          photo: user.photo_200 || user.photo_100 || ''
        };
      }
    } catch (error) {
      console.error('VKWebAppGetUserInfo error:', error);
    }
    return {
      id: 0,
      firstName: 'Тест',
      lastName: 'Игрок',
      photo: ''
    };
  }

  // TASK-SYNC: Чтение из нативного облачного хранилища VK (VKWebAppStorageGet)
  async storageGet(keys = ['cat_empire_progress']) {
    try {
      const timeoutMs = isVkEnvironment() ? 5000 : 400;
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const res = await Promise.race([
        this.bridge.send('VKWebAppStorageGet', { keys }),
        timeout
      ]);
      if (res && res.keys && Array.isArray(res.keys)) {
        const result = {};
        res.keys.forEach((item) => {
          if (item.value) {
            try {
              result[item.key] = JSON.parse(item.value);
            } catch (e) {
              result[item.key] = item.value;
            }
          }
        });
        return result;
      }
    } catch (e) {
      console.warn('VKWebAppStorageGet error:', e);
    }
    return null;
  }

  // TASK-SYNC: Сохранение в нативное облачное хранилище VK (VKWebAppStorageSet)
  async storageSet(key, value) {
    try {
      if (!this.bridge || typeof this.bridge.send !== 'function') return false;
      const timeoutMs = isVkEnvironment() ? 5000 : 400;
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
      await Promise.race([
        this.bridge.send('VKWebAppStorageSet', { key, value: stringValue }),
        timeout
      ]);
      return true;
    } catch (e) {
      console.warn('VKWebAppStorageSet error:', e);
      return false;
    }
  }

  // TASK-SHARE: Расшаривание ссылки друзьям или в сообщения (VKWebAppShare)
  async shareLink(customLink = VK_APP_LINK) {
    try {
      if (typeof eventTracker !== 'undefined' && eventTracker.trackShareTriggered) {
        eventTracker.trackShareTriggered('link');
      }
      if (this.bridge && typeof this.bridge.send === 'function' && isVkEnvironment()) {
        const res = await this.bridge.send('VKWebAppShare', { link: customLink || VK_APP_LINK });
        console.log('📢 VKWebAppShare result:', res);
        return { success: true, res };
      }
    } catch (e) {
      console.warn('⚠️ VKWebAppShare error/cancelled:', e);
      if (isVkEnvironment()) {
        return { success: false, reason: isVkUserCancel(e) ? 'user_cancelled' : 'vk_error', error: e };
      }
    }
    return { success: true, simulated: true };
  }

  // Пост на стену: одна ссылка во вложении (две ссылки VK режет). Без iframe-only и без фейкового success.
  async sharePost(message = 'Моя Империя Котиков растёт. Заходи поиграть.') {
    const text = wallPostMessage(message);
    try {
      if (typeof eventTracker !== 'undefined' && eventTracker.trackShareTriggered) {
        eventTracker.trackShareTriggered('wall_post');
      }
      if (this.bridge && typeof this.bridge.send === 'function' && isVkEnvironment()) {
        let res;
        try {
          res = await this.bridge.send('VKWebAppShowWallPostBox', {
            message: text,
            attachments: VK_APP_LINK
          });
        } catch (firstError) {
          if (isVkUserCancel(firstError)) {
            return { success: false, reason: 'user_cancelled', error: firstError };
          }
          res = await this.bridge.send('VKWebAppShowWallPostBox', { message: text });
        }
        console.log('📝 VKWebAppShowWallPostBox result:', res);
        const postId = res && (res.post_id || res.postId);
        if (postId) {
          return { success: true, postId, res };
        }
        if (res) {
          return { success: true, res };
        }
        return { success: false, reason: 'empty' };
      }
    } catch (e) {
      console.warn('⚠️ VKWebAppShowWallPostBox error/cancelled:', e);
      if (isVkUserCancel(e)) {
        return { success: false, reason: 'user_cancelled', error: e };
      }
      if (isVkEnvironment()) {
        return { success: false, reason: 'vk_error', error: e };
      }
    }
    return { success: true, simulated: true };
  }

  // TASK-021: Нативное приглашение друзей VK
  async showInviteBox() {
    try {
      if (typeof eventTracker !== 'undefined' && eventTracker.trackShareTriggered) {
        eventTracker.trackShareTriggered('invite');
      }
      if (this.bridge && typeof this.bridge.send === 'function' && isVkEnvironment()) {
        const res = await this.bridge.send('VKWebAppShowInviteBox');
        console.log('🤝 VKWebAppShowInviteBox result:', res);
        if (res && res.success) {
          return { success: true, res };
        }
        if (res && res.success === false) {
          return { success: false, reason: 'user_cancelled', res };
        }
        const share = await this.shareLink(VK_APP_LINK);
        if (share && share.success && !share.simulated) {
          return { success: true, via: 'share', res: share.res };
        }
        return { success: false, reason: (share && share.reason) || 'empty', res };
      }
    } catch (e) {
      console.warn('⚠️ VKWebAppShowInviteBox error/cancelled:', e);
      if (isVkUserCancel(e)) {
        return { success: false, reason: 'user_cancelled', error: e };
      }
      if (isVkEnvironment()) {
        const share = await this.shareLink(VK_APP_LINK);
        if (share && share.success && !share.simulated) {
          return { success: true, via: 'share', res: share.res };
        }
        return { success: false, reason: (share && share.reason) || 'vk_error', error: e };
      }
    }
    return { success: false, reason: 'not_vk', simulated: true };
  }

  async joinGroup(groupId) {
    try {
      const id = Number(groupId) || 0;
      if (!id) return { success: false, noGroup: true };
      if (!this.bridge || typeof this.bridge.send !== 'function' || !isVkEnvironment()) {
        return { success: false, simulated: true };
      }
      const res = await this.bridge.send('VKWebAppJoinGroup', { group_id: id });
      return { success: true, res };
    } catch (e) {
      console.warn('⚠️ VKWebAppJoinGroup error:', e);
      return { success: false, cancelled: true, error: e };
    }
  }

  // TASK-SHARE: Покупка предмета за голоса VK
  async showOrderBox(item) {
    try {
      if (!this.bridge || typeof this.bridge.send !== 'function' || !isVkEnvironment()) {
        return { success: false, unavailable: true };
      }
      const res = await this.bridge.send('VKWebAppShowOrderBox', {
        type: 'item',
        item: String(item)
      });
      console.log('💳 VKWebAppShowOrderBox result:', res);
      if (res && res.success === false) {
        return { success: false, cancelled: true, res };
      }
      return {
        success: true,
        orderId: res && (res.order_id || res.app_order_id) ? String(res.order_id || res.app_order_id) : null,
        res
      };
    } catch (e) {
      console.warn('⚠️ VKWebAppShowOrderBox error/cancelled:', e);
      const cancelled = !!(e && (e.error_type === 'client_error' || e.error_code === 4 || String(e.error_data && e.error_data.error_reason || '').toLowerCase().includes('cancel')));
      return { success: false, cancelled, error: e };
    }
  }

  // TASK-015B: Тактильная отдача (вибрация VK Haptics)
  triggerHaptic(style = 'medium') {
    try {
      this.bridge.send('VKWebAppTapticImpactOccurred', { style });
    } catch (e) {
      // Игнорируем в веб-версии
    }
  }
}

export default VKService;

