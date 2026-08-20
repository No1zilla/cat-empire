import { Application, Container, Graphics } from 'pixi.js';
import { CONFIG, fitGameHeight, canvasCssSize } from './config.js';
import { VKService } from './vk/VKBridge.js';
import { PlatformService } from './services/PlatformService.js';
import { Game } from './game/Game.js';
import { loadCatTextures } from './utils/catTextures.js';
import { soundManager } from './audio/SoundManager.js';
import { showDesktopBannerAd } from './api/vkAds.js';
import { saveProgress } from './api/client.js';
import { vkIdentity } from './services/VkIdentity.js';
import {
  readCssSafeArea,
  resolveViewInsets,
  contentBoxSize,
  applyContainerInsets
} from './vk/viewInsets.js';

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

let vkInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function liveInsets() {
  const css = (typeof document !== 'undefined' && typeof getComputedStyle === 'function')
    ? readCssSafeArea(getComputedStyle(document.documentElement))
    : { top: 0, right: 0, bottom: 0, left: 0 };
  return resolveViewInsets({
    css,
    vk: vkInsets,
    platform: PlatformService.getVkPlatform()
  });
}

function applyLiveInsets() {
  if (typeof document === 'undefined') return;
  applyContainerInsets(document.getElementById('game-container'), liveInsets());
}

function viewSize() {
  applyLiveInsets();
  const el = typeof document !== 'undefined' ? document.getElementById('game-container') : null;
  if (el) return contentBoxSize(el, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const w = (vv && vv.width) || (typeof window !== 'undefined' ? window.innerWidth : CONFIG.GAME_WIDTH);
  const h = (vv && vv.height) || (typeof window !== 'undefined' ? window.innerHeight : CONFIG.GAME_HEIGHT);
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

function applyCanvasFit(app) {
  if (!app || !app.canvas) return;
  const view = viewSize();
  const gameW = CONFIG.GAME_WIDTH;
  const gameH = (app.screen && app.screen.height) || CONFIG.GAME_HEIGHT;
  const css = canvasCssSize(view.w, view.h, gameW, gameH);
  const style = app.canvas.style;
  style.setProperty('width', `${css.width}px`, 'important');
  style.setProperty('height', `${css.height}px`, 'important');
  style.setProperty('max-width', 'none', 'important');
  style.setProperty('max-height', 'none', 'important');
  style.setProperty('object-fit', 'fill', 'important');
  style.setProperty('object-position', 'center center', 'important');
  style.display = 'block';
  style.margin = '0 auto';
  style.flex = '0 0 auto';
  const container = document.getElementById('game-container');
  if (container) {
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
  }
}

// Глобальный метод для отладки и сброса туториала
window.resetTutorial = () => {
  try { localStorage.removeItem('cat_empire_tutorial_done'); } catch (e) {}
  console.log('🔄 Флаг туториала сброшен! Перезагрузка...');
  location.reload();
};

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(label || 'timeout')), ms);
    })
  ]);
}

function showSplashRetry(error) {
  console.error('Ошибка при инициализации приложения:', error);
  if (error && error.message) {
    console.error('boot error:', error.message);
  }
  const txt = document.getElementById('splash-status-text');
  const splash = document.getElementById('splash-screen');
  if (txt) {
    txt.innerText = 'Не вышло загрузить. Нажми, чтобы попробовать снова.';
    txt.style.animation = 'none';
    txt.style.opacity = '1';
    txt.style.cursor = 'pointer';
  }
  if (splash) {
    splash.style.pointerEvents = 'auto';
    splash.style.cursor = 'pointer';
    splash.onclick = () => location.reload();
  }
}

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
      vkService.onInsets = (next) => {
        vkInsets = next;
        applyLiveInsets();
      };
      await vkService.init();
      vkInsets = vkService.lastInsets || vkInsets;
      applyLiveInsets();
    } catch (e) {
      console.warn('VK Bridge init warning:', e);
    }

    updateSplashProgress(35, 'Получаем профиль игрока...');
    try {
      userInfo = await vkService.getUserInfo();
      if (userInfo && userInfo.id) {
        vkIdentity.persistProfile(userInfo);
        try {
          if (!localStorage.getItem('cat_empire_vk_launch_params')) {
            localStorage.setItem('cat_empire_vk_launch_params', `vk_user_id=${userInfo.id}`);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('VK UserInfo warning:', e);
    }

    showDesktopBannerAd().catch((e) => {
      console.warn('VK banner during splash skipped:', e);
    });
  } else {
    updateSplashProgress(35, 'Инициализация Android...');
    userInfo = { firstName: 'Котовед', lastName: 'Игрок' };
  }

  // 3. Создать PIXI.Application для PixiJS v8
  updateSplashProgress(55, 'Инициализируем графику PixiJS...');
  const view = viewSize();
  fitGameHeight(view.w, view.h);
  const app = new Application();
  const options = {
    width: CONFIG.GAME_WIDTH,
    height: CONFIG.GAME_HEIGHT,
    backgroundColor: 0x100b20,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
    preference: 'webgl'
  };

  try {
    await withTimeout(app.init(options), 8000, 'Pixi init timeout');
  } catch (e) {
    console.warn('Pixi init failed:', e);
    if (!app.renderer) {
      await withTimeout(app.init({
        ...options,
        antialias: false,
        resolution: 1
      }), 8000, 'Pixi init retry timeout');
    }
  }
  if (!app.canvas) {
    throw new Error('Pixi canvas missing');
  }
  const container = document.getElementById('game-container');
  if (container) {
    applyCanvasFit(app);
    container.appendChild(app.canvas);
  }

  try {
    _createBackgroundAndParticles(app);
  } catch (e) {
    console.warn('Background particles skipped:', e);
  }

  const userName = userInfo
    ? `${userInfo.firstName} ${userInfo.lastName}`.trim()
    : 'Тест Игрок';

  updateSplashProgress(90, 'Загружаем текстуры котиков...');
  try {
    await withTimeout(loadCatTextures(), 12000, 'cat textures timeout');
  } catch (e) {
    console.warn('⚠️ Спрайты ещё грузятся, поле обновится когда PNG доедут:', e && e.message);
  }

  updateSplashProgress(98, 'Строим королевство котиков...');
  const game = new Game(app);
  if (typeof window !== 'undefined') {
    window.game = game;
  }
  await withTimeout(game.init(userName, userInfo), 15000, 'game.init timeout');

  const syncCanvasSize = () => {
    const next = fitGameHeight(viewSize().w, viewSize().h);
    if (app.renderer && app.renderer.height !== next) {
      app.renderer.resize(CONFIG.GAME_WIDTH, next);
      if (game && typeof game._layoutChrome === 'function') game._layoutChrome();
    }
    applyCanvasFit(app);
  };
  window.addEventListener('resize', syncCanvasSize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncCanvasSize);
  }

  if (userInfo && (userInfo.firstName || userInfo.lastName || userInfo.photo)) {
    saveProgress({
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      avatar: userInfo.photo
    }).catch(() => {});
  }

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
  showSplashRetry(error);
});
