import { Application, Container, Graphics } from 'pixi.js';
import { CONFIG } from './config.js';
import { VKService } from './vk/VKBridge.js';
import { Game } from './game/Game.js';
import { loadCatTextures } from './utils/catTextures.js';

// Точка входа в приложение
async function initApp() {
  console.log('🚀 Инициализация приложения (TASK-015 Visual Glow-Up)...');

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
    backgroundColor: 0x100b20,
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

  // TASK-015: Глобальный фон и система плавающих звёздных частиц
  _createBackgroundAndParticles(app);

  // 5. Подготовка имени пользователя
  const userName = userInfo
    ? `${userInfo.firstName} ${userInfo.lastName}`.trim()
    : 'Тест Игрок';

  // 6. Загрузка спрайтов котиков
  try {
    await loadCatTextures();
  } catch (e) {
    console.warn('⚠️ Спрайты не загружены, используются эмодзи:', e.message);
  }

  // 7. Создать экземпляр Game(app) и запустить
  const game = new Game(app);
  await game.init(userName);

  console.log('🐱 Империя Котиков запущены со стилем Premium Glow-Up!');
}

/**
 * TASK-015: Анимированный фоновый градиент и плавающие звёздочки
 */
function _createBackgroundAndParticles(app) {
  const W = CONFIG.GAME_WIDTH;
  const H = CONFIG.GAME_HEIGHT;

  const bgContainer = new Container();

  // 1. Тёмно-фиолетовая подложка
  const bg = new Graphics();
  bg.rect(0, 0, W, H);
  bg.fill(0x100b20);
  bgContainer.addChild(bg);

  // Мягкое внутреннее свечение в центре (радиальный шар)
  const glowCenter = new Graphics();
  glowCenter.circle(W / 2, H / 2 - 50, 220);
  glowCenter.fill({ color: 0x3d2375, alpha: 0.35 });
  bgContainer.addChild(glowCenter);

  // 2. Система дрейфующих плавающих частиц (звёздочек)
  const particleCount = 28;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    const p = new Graphics();
    const radius = Math.random() * 2 + 1;
    const isStar = Math.random() > 0.5;

    if (isStar) {
      p.star(0, 0, 4, radius + 2, radius);
      p.fill({ color: Math.random() > 0.3 ? 0xffd700 : 0xa8d8ff, alpha: 0.7 });
    } else {
      p.circle(0, 0, radius);
      p.fill({ color: 0xffffff, alpha: 0.6 });
    }

    p.x = Math.random() * W;
    p.y = Math.random() * H;

    const particleData = {
      graphic: p,
      speedY: Math.random() * 0.4 + 0.15,
      speedX: (Math.random() - 0.5) * 0.2,
      pulseSpeed: Math.random() * 0.003 + 0.001,
      phase: Math.random() * Math.PI * 2
    };

    particles.push(particleData);
    bgContainer.addChild(p);
  }

  app.stage.addChildAt(bgContainer, 0);

  // Петля анимации движения частиц
  const start = performance.now();
  const updateParticles = () => {
    if (app.destroyed) return;
    const now = performance.now() - start;

    particles.forEach((pd) => {
      pd.graphic.y -= pd.speedY;
      pd.graphic.x += pd.speedX;
      pd.graphic.alpha = 0.3 + Math.sin(now * pd.pulseSpeed + pd.phase) * 0.35;

      if (pd.graphic.y < -10) {
        pd.graphic.y = H + 10;
        pd.graphic.x = Math.random() * W;
      }
      if (pd.graphic.x < -10) pd.graphic.x = W + 10;
      if (pd.graphic.x > W + 10) pd.graphic.x = -10;
    });

    requestAnimationFrame(updateParticles);
  };

  requestAnimationFrame(updateParticles);
}

initApp().catch((error) => {
  console.error('Ошибка при инициализации приложения:', error);
});
