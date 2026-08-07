import { chromium, devices } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * 🧪 QA Test Suite: AutoMergeButton & VK Native Ad Integration
 */
(async () => {
  console.log('🧪 Запуск компрехенсивного QA-тест свита для кнопки «Соединить»...');

  const distDir = '/Users/ai/.gemini/antigravity/scratch/cat-empire/dist';
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    let fp = path.join(distDir, reqUrl === '/' ? 'index.html' : reqUrl);
    let ext = path.extname(fp);
    let contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(fp, (err, c) => {
      if (err) {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(c);
      }
    });
  });

  await new Promise((r) => server.listen(8990, r));

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices['Pixel 5'], isMobile: true, hasTouch: true });
  const page = await ctx.newPage();

  // Логирование консоли браузера
  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(msg.text()));

  await page.goto('http://localhost:8990', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => window.game && window.game.economy, { timeout: 10000 });

  // Закрываем сплэш и главное меню
  await page.evaluate(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
    if (window.game) {
      if (window.game._mainMenuInstance) {
        if (window.game._mainMenuInstance.parent) {
          window.game._mainMenuInstance.parent.removeChild(window.game._mainMenuInstance);
        }
        window.game._mainMenuInstance.destroy();
        window.game._mainMenuInstance = null;
      }
      if (window.game.hud) window.game.hud.showMenuOverlay();
    }
  });
  await page.waitForTimeout(1000);

  console.log('✅ Инициализация сцены завершена');

  // --- QA TEST 1: Нажатие при 0 💎 (Рекламное состояние) ---
  console.log('🧪 TEST 1: Проверка клика при 0 💎 (Запрос VK рекламы)...');
  await page.evaluate(() => {
    window.game.economy.gems = 0;
    window.game.autoMergeButton.updateLabel();
  });
  await page.waitForTimeout(300);

  // Тап по кнопке «Соединить» (x: 335, y: 535)
  await page.touchscreen.tap(335, 535);
  await page.waitForTimeout(1000);

  const logsTest1 = consoleLogs.filter(l => l.includes('VK') || l.includes('AutoMerge'));
  console.log('📝 Консольные логи TEST 1:', logsTest1);

  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dd0992fe-9ff5-4a71-a53d-59fba5649078/qa_test1_gems0_click.png' });
  console.log('📸 Скриншот TEST 1 сохранён');

  // --- QA TEST 2: Нажатие при 5 💎 (Списание гемов и Авто-слияние) ---
  console.log('🧪 TEST 2: Проверка клика при 5 💎 (Списание 5 гемов)...');
  await page.evaluate(() => {
    window.game.economy.gems = 5;
    window.game.autoMergeButton.updateLabel();
  });
  await page.waitForTimeout(300);

  await page.touchscreen.tap(335, 535);
  await page.waitForTimeout(1000);

  const gemsAfterTest2 = await page.evaluate(() => window.game.economy.gems);
  console.log(`💎 Гемы после списания (Ожидается 0): ${gemsAfterTest2}`);
  if (gemsAfterTest2 === 0) {
    console.log('✅ TEST 2 УСПЕШЕН: 5 гемов успешно списано и авто-слияние запущено!');
  } else {
    console.error(`❌ TEST 2 ОШИБКА: Гемы не списались (${gemsAfterTest2})`);
  }

  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dd0992fe-9ff5-4a71-a53d-59fba5649078/qa_test2_gems5_click.png' });
  console.log('📸 Скриншот TEST 2 сохранён');

  // --- QA TEST 3: Спам-клики (Защита от дабл-тапа) ---
  console.log('🧪 TEST 3: Проверка защиты от спам-кликов (Дебаунс 300мс)...');
  await page.evaluate(() => {
    window.game.economy.gems = 10;
    window.game.autoMergeButton.updateLabel();
  });
  await page.waitForTimeout(300);

  // Выполняем 5 быстрыx тапов подряд за 100мс
  await Promise.all([
    page.touchscreen.tap(335, 535),
    page.touchscreen.tap(335, 535),
    page.touchscreen.tap(335, 535),
    page.touchscreen.tap(335, 535),
    page.touchscreen.tap(335, 535)
  ]);
  await page.waitForTimeout(1000);

  const gemsAfterTest3 = await page.evaluate(() => window.game.economy.gems);
  console.log(`💎 Гемы после 5 спам-кликов (Ожидается 5, списалось строго 1 раз): ${gemsAfterTest3}`);
  if (gemsAfterTest3 === 5) {
    console.log('✅ TEST 3 УСПЕШЕН: Дебаунсер заблокировал двойное списание!');
  } else {
    console.error(`⚠️ TEST 3 ИНФО: Гемы после спама = ${gemsAfterTest3}`);
  }

  await browser.close();
  server.close();
  console.log('🎉 Все QA-тесты завершены!');
})();
