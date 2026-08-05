import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const snapshotsDir = path.resolve(__dirname, '../snapshots');
const diffsDir = path.resolve(__dirname, '../snapshots/diffs');

if (!fs.existsSync(diffsDir)) {
  fs.mkdirSync(diffsDir, { recursive: true });
}

// Простой локальный HTTP сервер
function startServer(port = 8769) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function runVisualRegressionRunner() {
  console.log('⚡ Запуск HTTP-сервера для Visual Regression Test...');
  const server = await startServer(8769);
  console.log('🌐 Сервер запущен на http://localhost:8769');

  console.log('🔍 Запуск Visual Pixel-by-Pixel Audit (сравнение с эталонами)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();

  await page.goto('http://localhost:8769');
  await page.waitForTimeout(6000);

  const targets = [
    {
      name: 'Главное Меню',
      goldenFile: 'golden_main_menu.png',
      actionBefore: async () => {},
      clip: null
    },
    {
      name: 'Шапка HUD',
      goldenFile: 'golden_hud_header.png',
      actionBefore: async () => {
        await page.mouse.click(187, 385); // Клик «▶️ ИГРАТЬ»
        await page.waitForTimeout(1000);
      },
      clip: { x: 0, y: 0, width: 375, height: 60 }
    },
    {
      name: 'Игровое поле 5x5',
      goldenFile: 'golden_gameplay_grid.png',
      actionBefore: async () => {},
      clip: null
    },
    {
      name: 'Окно Настроек',
      goldenFile: 'golden_settings_modal.png',
      actionBefore: async () => {
        await page.mouse.click(346, 25); // Клик 🏠
        await page.waitForTimeout(500);
        await page.mouse.click(187, 495); // Клик Настройки
        await page.waitForTimeout(500);
      },
      clip: null
    }
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const t of targets) {
    await t.actionBefore();
    const goldenPath = path.join(snapshotsDir, t.goldenFile);
    if (!fs.existsSync(goldenPath)) {
      console.warn(`⚠️ Эталон ${t.goldenFile} не найден. Пропускаем.`);
      continue;
    }

    const goldenBase64 = fs.readFileSync(goldenPath).toString('base64');
    const freshScreenshotBuffer = await page.screenshot({ clip: t.clip || undefined });
    const freshBase64 = freshScreenshotBuffer.toString('base64');

    // Попиксельное сравнение пикселей RGBA внутри браузера через Canvas 2D API
    const diffResult = await page.evaluate(async ({ b64A, b64B }) => {
      const loadImage = (src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });

      const imgA = await loadImage('data:image/png;base64,' + b64A);
      const imgB = await loadImage('data:image/png;base64,' + b64B);

      const w = Math.min(imgA.width, imgB.width);
      const h = Math.min(imgA.height, imgB.height);

      const canvasA = document.createElement('canvas');
      canvasA.width = w; canvasA.height = h;
      const ctxA = canvasA.getContext('2d');
      ctxA.drawImage(imgA, 0, 0);
      const dataA = ctxA.getImageData(0, 0, w, h).data;

      const canvasB = document.createElement('canvas');
      canvasB.width = w; canvasB.height = h;
      const ctxB = canvasB.getContext('2d');
      ctxB.drawImage(imgB, 0, 0);
      const dataB = ctxB.getImageData(0, 0, w, h).data;

      let pixelDiffs = 0;
      const totalPixels = w * h;

      for (let i = 0; i < dataA.length; i += 4) {
        const rDiff = Math.abs(dataA[i] - dataB[i]);
        const gDiff = Math.abs(dataA[i + 1] - dataB[i + 1]);
        const bDiff = Math.abs(dataA[i + 2] - dataB[i + 2]);
        const aDiff = Math.abs(dataA[i + 3] - dataB[i + 3]);

        // Порог допущения незначительного сглаживания (anti-aliasing tolerance = 15)
        if (rDiff > 15 || gDiff > 15 || bDiff > 15 || aDiff > 15) {
          pixelDiffs++;
        }
      }

      const diffRatio = (pixelDiffs / totalPixels) * 100;
      return { diffRatio, pixelDiffs, totalPixels };
    }, { b64A: goldenBase64, b64B: freshBase64 });

    if (diffResult.diffRatio < 3.5) { // Допуск 3.5% на динамические анимированные всплывающие доходы (+169/сек) и свечения
      console.log(`✅ [MATCH] ${t.name}: Попиксельное совпадение ${(100 - diffResult.diffRatio).toFixed(2)}%! (Различие пикселей: ${diffResult.diffRatio.toFixed(2)}%)`);
      passedCount++;
    } else {
      console.error(`❌ [VISUAL DIFF DETECTED] ${t.name}: верстка разъехалась на ${diffResult.diffRatio.toFixed(2)}%! (${diffResult.pixelDiffs} пикселей)`);
      const diffPath = path.join(diffsDir, `failed_${t.goldenFile}`);
      fs.writeFileSync(diffPath, freshScreenshotBuffer);
      console.error(`📸 Разъехавшийся скриншот сохранён для отладки: ${diffPath}`);
      failedCount++;
    }
  }

  await browser.close();
  server.close();

  console.log('\n========================================');
  console.log(`📊 ИТОГИ ПОПИКСЕЛЬНОГО ВИЗУАЛЬНОГО ТЕСТИРОВАНИЯ:`);
  console.log(`✅ Прошло: ${passedCount} / ${targets.length}`);
  console.log(`❌ Ошибок: ${failedCount} / ${targets.length}`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runVisualRegressionRunner().catch(e => {
  console.error('Ошибка визуального контроллера:', e);
  process.exit(1);
});
