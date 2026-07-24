import { Application } from 'pixi.js';
import { CONFIG } from './config.js';
import { VKService } from './vk/VKBridge.js';
import { Game } from './game/Game.js';

// Точка входа в приложение
async function initApp() {
  // 1. Создать экземпляр VKService и инициализировать VK Bridge
  const vkService = new VKService();
  await vkService.init();

  // 2. Получить userInfo через getUserInfo()
  const userInfo = await vkService.getUserInfo();

  // 3. Создать PIXI.Application для PixiJS v8
  const app = new Application();
  const options = {
    width: CONFIG.GAME_WIDTH,
    height: CONFIG.GAME_HEIGHT,
    backgroundColor: CONFIG.COLORS.BG,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
  };

  // 4. Инициализация PixiJS v8 (асинхронно)
  await app.init(options);
  const container = document.getElementById('game-container');
  if (container) {
    container.appendChild(app.canvas);
  }

  // 5. Подготовка имени пользователя
  const userName = userInfo
    ? `${userInfo.firstName} ${userInfo.lastName}`.trim()
    : 'Тест Игрок';

  // 6. Создать экземпляр Game(app) и вызывать асинхронный game.init()
  const game = new Game(app);
  await game.init(userName);

  // 7. Console.log('🐱 Империя Котиков загружена!')
  console.log('🐱 Империя Котиков загружена!');
}

initApp().catch((error) => {
  console.error('Ошибка при инициализации приложения:', error);
});
