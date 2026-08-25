import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '../..');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');
export const SNAPSHOTS_DIR = path.join(ROOT_DIR, 'snapshots');
export const DIFFS_DIR = path.join(SNAPSHOTS_DIR, 'diffs');

export const VIEWPORT = { width: 410, height: 700 };

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

/**
 * Простой статический сервер поверх собранного `dist/`.
 * Пути с query-строкой режем, иначе Vite-ассеты с `?v=` уходят в 404.
 */
export function startStaticServer(port) {
  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    const filePath = path.join(DIST_DIR, url === '/' ? 'index.html' : url);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream'
      });
      res.end(content);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

export function assertDistBuilt() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html не найден — сначала `npm run build`');
  }
}

/**
 * Скрипт, который выполняется в странице ДО загрузки приложения.
 * Задача — убрать всё, что зависит от истории игрока и от времени суток:
 * иначе кадр зависит от того, когда в прошлый раз заходили, и сравнение бессмысленно.
 */
function deterministicBootScript() {
  // Детерминированный ГПСЧ (LCG): фоновые звёзды и разброс idle-анимаций
  // рождаются из Math.random, а значит без сида кадр каждый раз новый.
  let seed = 0x2f6e2b1;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  try {
    localStorage.clear();
    // Туториал «Сдвинь двух котиков» затемняет всё поле — гасим флагом «пройден».
    localStorage.setItem('cat_empire_tutorial_done', '1');
    localStorage.setItem('cat_empire_tutorial_outcome', 'merge');
    // Офлайн-доход («С ВОЗВРАЩЕНИЕМ!») считается от этой метки.
    // Ставим «зашли только что» — модалка не появится.
    localStorage.setItem('cat_empire_last_timestamp', String(Date.now()));
  } catch (e) {}
}

/**
 * Заморозка сцены. Всё, что шевелится, живёт на requestAnimationFrame
 * (покачивание котиков, пульс свечения, звёздная пыль, всплывающие «+N»)
 * или на setInterval (капающие монеты). Пока это работает, два кадра подряд
 * никогда не совпадут, и любой порог сравнения превращается в фикцию.
 */
async function freezeScene(page) {
  // Шаг 1: гасим источники таймеров и даём догореть уже летящим «+N».
  await page.evaluate(() => {
    const game = window.game;
    if (game._floatingInterval) {
      clearInterval(game._floatingInterval);
      game._floatingInterval = null;
    }
    if (game._autoSaveInterval) {
      clearInterval(game._autoSaveInterval);
      game._autoSaveInterval = null;
    }
    if (game.economy) game.economy.stopTicker();
    if (game.liveOpsRow && game.liveOpsRow._timer) {
      clearInterval(game.liveOpsRow._timer);
      game.liveOpsRow._timer = null;
    }
  });
  await page.waitForTimeout(900);

  // Шаг 2: убиваем цикл анимации целиком. Внутренний RAF тикера Pixi умирает
  // вместе с ним, поэтому дальше кадр рисуем вручную через app.render().
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    window.game.app.ticker.stop();
  });
}

/**
 * Приводит сцену к фиксированному состоянию и рисует ровно один кадр.
 * Вызывается перед каждым скриншотом: анимации уже мертвы, но значения,
 * на которых они остановились, нужно вернуть в нулевую фазу.
 */
async function pinAndRender(page) {
  await page.evaluate(() => {
    const game = window.game;
    const app = game.app;

    // Монеты капают раз в секунду и лезут и в HUD, и в подписи кнопок
    // («Заполнить 15·106»). Фиксируем стартовый баланс.
    if (game.economy) game.economy.setBalance(100, 10, 0, 0);

    // Котики покачиваются по синусоиде и пульсируют свечением — нулевая фаза.
    const slots = (game.grid && game.grid.slots) || [];
    slots.forEach((cat) => {
      if (!cat) return;
      if (cat._animatedContainer) cat._animatedContainer.y = 0;
      if (cat._glowGraphic) cat._glowGraphic.alpha = 0.55;
    });

    // Звёздная пыль на фоне: координаты из Math.random плюс дрейф по кадрам.
    // Сидированный ГПСЧ чинит только старт, дрейф всё равно плавает,
    // поэтому слой прячем — к вёрстке он отношения не имеет.
    const bgContainer = app.stage.children[0];
    if (bgContainer && bgContainer.children) {
      bgContainer.children.forEach((child) => {
        if (child.width < 20) child.visible = false;
      });
    }

    app.render();
  });
}

/**
 * Поднимает браузерную страницу с игрой в детерминированном состоянии.
 * Возвращает страницу, на которой уже можно дёргать window.game.
 */
export async function openGamePage(browser, port) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    // 404 от /api/* — это отсутствующий бэкенд, для вёрстки безразлично.
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
      errors.push(msg.text());
    }
  });

  await page.addInitScript(deterministicBootScript);
  await page.goto(`http://localhost:${port}`);
  await page.waitForFunction(() => window.game && window.game.app && window.game.grid, null, {
    timeout: 40000
  });
  // Догружаются PNG котиков и раскладывается чром — без паузы кадр «дорисовывается».
  await page.waitForTimeout(3000);
  await freezeScene(page);

  return { page, errors };
}

/**
 * Сценарии. Один список на генератор эталонов и на сравнение —
 * ровно из-за расхождения этих двух флоу сюита и протухла:
 * эталон `main_menu` снимался с игрового поля, потому что меню при загрузке
 * больше не показывается (`shouldSkipBootMenu()` возвращает true).
 */
export const SCENES = [
  {
    name: 'Игровое поле 5x5',
    goldenFile: 'golden_gameplay_grid.png',
    clip: null,
    maxDiff: 0.1,
    // Загрузка сразу отдаёт игровое поле — это и есть стартовый экран.
    setup: async () => {}
  },
  {
    name: 'Шапка HUD',
    goldenFile: 'golden_hud_header.png',
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: 60 },
    maxDiff: 0.1,
    setup: async () => {}
  },
  {
    name: 'Главное Меню',
    goldenFile: 'golden_main_menu.png',
    clip: null,
    maxDiff: 0.1,
    // Меню открывается только по кнопке-лапке в HUD, ждать его при загрузке бесполезно.
    setup: async (page) => {
      await page.evaluate(() => window.game.showMainMenu());
    }
  },
  {
    name: 'Окно Настроек',
    goldenFile: 'golden_settings_modal.png',
    clip: null,
    maxDiff: 0.1,
    // Настройки открываются из главного меню — воспроизводим этот же порядок.
    setup: async (page) => {
      await page.evaluate(() => {
        window.game.showMainMenu();
        window.game.showSettingsModal();
      });
    }
  }
];

export async function captureScene(page, scene) {
  await scene.setup(page);
  await pinAndRender(page);
  return page.screenshot({ clip: scene.clip || undefined });
}

/**
 * Попиксельное RGBA-сравнение двух PNG через Canvas 2D.
 * Считаем на отдельной пустой вкладке, чтобы не трогать замороженную сцену.
 */
export async function comparePngs(comparePage, bufferA, bufferB) {
  return comparePage.evaluate(
    async ({ b64A, b64B }) => {
      const loadImage = (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = src;
        });

      const imgA = await loadImage('data:image/png;base64,' + b64A);
      const imgB = await loadImage('data:image/png;base64,' + b64B);

      const sizeMismatch = imgA.width !== imgB.width || imgA.height !== imgB.height;
      const w = Math.min(imgA.width, imgB.width);
      const h = Math.min(imgA.height, imgB.height);

      const read = (img) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };

      const dataA = read(imgA);
      const dataB = read(imgB);

      let pixelDiffs = 0;
      for (let i = 0; i < dataA.length; i += 4) {
        // Допуск на сглаживание шрифтов — 15 уровней на канал.
        if (
          Math.abs(dataA[i] - dataB[i]) > 15 ||
          Math.abs(dataA[i + 1] - dataB[i + 1]) > 15 ||
          Math.abs(dataA[i + 2] - dataB[i + 2]) > 15 ||
          Math.abs(dataA[i + 3] - dataB[i + 3]) > 15
        ) {
          pixelDiffs++;
        }
      }

      return {
        diffRatio: (pixelDiffs / (w * h)) * 100,
        pixelDiffs,
        totalPixels: w * h,
        sizeMismatch,
        sizeA: `${imgA.width}x${imgA.height}`,
        sizeB: `${imgB.width}x${imgB.height}`
      };
    },
    { b64A: bufferA.toString('base64'), b64B: bufferB.toString('base64') }
  );
}

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
