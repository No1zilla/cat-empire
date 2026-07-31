import bridge from '@vkontakte/vk-bridge';

if (typeof window !== 'undefined') {
  window.vkBridge = bridge;
}

// Класс VKService для взаимодействия с VK Mini Apps SDK
export class VKService {
  constructor() {
    this.bridge = bridge;
  }

  // Инициализация VK Bridge
  async init() {
    try {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
      const result = await Promise.race([this.bridge.send('VKWebAppInit'), timeout]);
      console.log('VKWebAppInit result:', result);
      return result;
    } catch (error) {
      console.error('VKWebAppInit error:', error);
      return null;
    }
  }

  // Получение данных пользователя (С надежным тайм-аутом 5 секунд для смартфона)
  async getUserInfo() {
    try {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
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
