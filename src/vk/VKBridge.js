import bridge from '@vkontakte/vk-bridge';

if (typeof window !== 'undefined') {
  window.vkBridge = bridge;
}

function isVkEnvironment() {
  if (typeof window === 'undefined') return false;
  const urlStr = window.location.search + window.location.hash;
  if (urlStr.includes('vk_user_id') || urlStr.includes('vk_app_id') || urlStr.includes('vk_platform')) {
    return true;
  }
  if (localStorage.getItem('cat_empire_vk_user_id') || localStorage.getItem('cat_empire_vk_launch_params')) {
    return true;
  }
  if (window.self !== window.top) {
    return true;
  }
  return false;
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

