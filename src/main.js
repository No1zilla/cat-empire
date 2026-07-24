import { Application } from 'pixi.js';
import { CONFIG } from './config.js';
import { VKService } from './vk/VKBridge.js';
import { Game } from './game/Game.js';
import { loadCatTextures } from './utils/catTextures.js'; // TASK-008

// Точка входа в приложение
async function initApp() {
  console.log('🚀 Инициализация приложения...');

  // 1. Создать экземпляр VKService и инициализировать VK Bridge
  const vkService = new VKService();
  try {
    await vkService.init();
  } catch (e) {
    console.warn('VK Bridge init warning:', e);
  }

  // 2. Получить userInfo через getUserInfo()
  let userInfo = null;
  try {
    userInfo = await vkService.getUserInfo();
  } catch (e) {
    console.warn('VK UserInfo warning:', e);
  }

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
    app.canvas.style.maxWidth = '100%';
    app.canvas.style.maxHeight = '100%';
    app.canvas.style.objectFit = 'contain';
    container.appendChild(app.canvas);
  }

  // 5. Подготовка имени пользователя
  const userName = userInfo
    ? `${userInfo.firstName} ${userInfo.lastName}`.trim()
    : 'Тест Игрок';

  // 6. TASK-008: Загрузка спрайтов котиков (с fallback на эмодзи при ошибке)
  try {
    await loadCatTextures();
  } catch (e) {
    console.warn('⚠️ Спрайты не загружены, используются эмодзи:', e.message);
  }

  // 7. Создать экземпляр Game(app) и вызывать асинхронный game.init()
  const game = new Game(app);
  await game.init(userName);

  // 7. Console.log('🐱 Империя Котиков загружена!')
  console.log('🐱 Империя Котиков загружена!');
}

initApp().catch((error) => {
  console.error('Ошибка при инициализации приложения:', error);
});
