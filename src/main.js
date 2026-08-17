import { Application, Container, Graphics } from 'pixi.js';
import { CONFIG } from './config.js';
import { VKService } from './vk/VKBridge.js';
import { PlatformService } from './services/PlatformService.js';
import { Game } from './game/Game.js';
import { loadCatTextures } from './utils/catTextures.js';
import { soundManager } from './audio/SoundManager.js';
import { showDesktopBannerAd } from './api/vkAds.js';

// Глобальная блокировка браузерного выделения текста и drag-out элементов
if (typeof document !== 'undefined') {
  document.addEventListener('selectstart', (e) => e.preventDefault(), false);
  document.addEventListener('dragstart', (e) => e.preventDefault(), false);
  const unlockAudio = () => {
    soundManager.unlock();
    document.removeEventListener('pointerdown', unlockAudio);
  };
  document.addEventListener('pointerdown', unlockAudio, { passive: true });
}

// Глобальный метод для отладки и сброса туториала
window.resetTutorial = () => {
  localStorage.removeItem('cat_empire_tutorial_done');
  console.log('🔄 Флаг туториала сброшен! Перезагрузка...');
  location.reload();
};

// Обновление прогресс-бара на экране загрузки (Splash Screen)
function updateSplashProgress(percent, statusText) {
  const bar = document.getElementById('splash-progress');
  const txt = document.getElementById('splash-status-text');
  if (bar) bar.style.width = `${percent}%`;
  if (txt && statusText) txt.innerText = statusText;
}

// Плавное удаление экрана загрузки
function hideSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.pointerEvents = 'none';
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.25s ease-out';
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      splash.remove();
    }, 250);
  }
}

// Точка входа в приложение
async function initApp() {
  console.log(`🚀 Инициализация приложения (${PlatformService.platform.toUpperCase()})...`);
  
  let userInfo = null;
  if (PlatformService.isVK()) {
    updateSplashProgress(15, 'Подключаем VK Bridge...');
    const vkService = new VKService();
    try {
      await vkService.init();
    } catch (e) {
      console.warn('VK Bridge init warning:', e);
    }

    updateSplashProgress(35, 'Получаем профиль игрока...');
    try {
      userInfo = await vkService.getUserInfo();
      if (userInfo && userInfo.id) {
        localStorage.setItem('cat_empire_vk_user_id', String(userInfo.id));
        if (!localStorage.getItem('cat_empire_vk_launch_params')) {
          localStorage.setItem('cat_empire_vk_launch_params', `vk_user_id=${userInfo.id}`);
        }
      }
    } catch (e) {
      console.warn('VK UserInfo warning:', e);
    }
  } else {
    updateSplashProgress(35, 'Инициализация Android...');
    userInfo = { firstName: 'Котовед', lastName: 'Игрок' };
  }

  // 3. Создать PIXI.Application для PixiJS v8
  updateSplashProgress(55, 'Инициализируем графику PixiJS...');
  const app = new Application();
  const options = {
    width: CONFIG.GAME_WIDTH,
    height: CONFIG.GAME_HEIGHT,
    backgroundColor: 0x100b20,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
  };

  await app.init(options);
  const container = document.getElementById('game-container');
  if (container) {
    app.canvas.style.maxWidth = '100%';
    app.canvas.style.maxHeight = '100%';
    app.canvas.style.objectFit = 'contain';
    container.appendChild(app.canvas);
  }

  _createBackgroundAndParticles(app);

  const userName = userInfo
    ? `${userInfo.firstName} ${userInfo.lastName}`.trim()
    : 'Тест Игрок';

  updateSplashProgress(90, 'Загружаем текстуры котиков...');
  try {
    await loadCatTextures();
  } catch (e) {
    console.warn('⚠️ Спрайты не загружены, используются эмодзи:', e.message);
  }

  updateSplashProgress(98, 'Строим королевство котиков...');
  const game = new Game(app);
  if (typeof window !== 'undefined') {
    window.game = game;
  }
  await game.init(userName);

  updateSplashProgress(100, 'Готово! 👑');
  // Скрывать сплэш строго после полной готовности сцены
  hideSplashScreen();

  if (PlatformService.isVK() && PlatformService.isDesktopVK()) {
    showDesktopBannerAd().catch((e) => {
      console.warn('VK desktop banner skipped:', e);
    });
  }

  console.log('🐱 Империя Котиков запущены со стилем Premium Splash & Glow!');
}

/**
 * TASK-015: Анимированный фоновый градиент и плавающие звёздочки
 */
function _createBackgroundAndParticles(app) {
  const W = CONFIG.GAME_WIDTH;
  const H = CONFIG.GAME_HEIGHT;

  const bgContainer = new Container();

  const bg = new Graphics();
  bg.rect(0, 0, W, H);
  bg.fill(0x100b20);
  bgContainer.addChild(bg);

  const glowCenter = new Graphics();
  glowCenter.circle(W / 2, H / 2 - 50, 220);
  glowCenter.fill({ color: 0x3d2375, alpha: 0.35 });
  bgContainer.addChild(glowCenter);

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
  const txt = document.getElementById('splash-status-text');
  if (txt) txt.innerText = 'Не вышло загрузить. Закрой мини-приложение и зайди снова.';
});
