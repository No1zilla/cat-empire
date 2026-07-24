import bridge from '@vkontakte/vk-bridge';

// Класс VKService для взаимодействия с VK Mini Apps SDK
export class VKService {
  constructor() {
    this.bridge = bridge;
  }

  // Инициализация VK Bridge
  async init() {
    try {
      const result = await this.bridge.send('VKWebAppInit');
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
      const user = await this.bridge.send('VKWebAppGetUserInfo');
      console.log('VKWebAppGetUserInfo result:', user);
      return {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        photo: user.photo_200 || user.photo_100 || ''
      };
    } catch (error) {
      console.error('VKWebAppGetUserInfo error:', error);
      // Возврат mock-данных при недоступности VK Bridge (локальная разработка)
      return {
        id: 0,
        firstName: 'Тест',
        lastName: 'Игрок',
        photo: ''
      };
    }
  }
}

export default VKService;
