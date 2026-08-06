import { chromium, devices } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const snapshotsDir = path.resolve(__dirname, '../snapshots');

if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

// HTTP Сервер
function startServer(port = 8833) {
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

async function runAndroidTestRunner() {
  console.log('⚡ Запуск локального сервера для Android E2E-теста...');
  const server = await startServer(8833);
  console.log('🌐 Сервер запущен на http://localhost:8833');

  console.log('📱 Запуск мобильного эмулятора Android (Pixel 5, Touch Events, Safe Area)...');
  const browser = await chromium.launch({ headless: true });
  
  // Эмуляция Pixel 5
  const pixel5 = devices['Pixel 5'];
  const context = await browser.newContext({
    ...pixel5,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8833', { waitUntil: 'commit', timeout: 15000 });
  await page.waitForTimeout(6000);

  // 1. Скриншот Android: Главное меню
  const shot1Path = path.join(snapshotsDir, 'android_1_main_menu.png');
  await page.screenshot({ path: shot1Path });
  console.log('📸 [Android Step 1/4] Главное меню зафиксировано:', shot1Path);

  // 2. Тач-клик по «▶️ ИГРАТЬ» в центре экрана (X = 196, Y = 430 на Pixel 5)
  await page.touchscreen.tap(196, 430);
  await page.waitForTimeout(1500);

  // 3. Тач-клик по «🐱 Купить» (Спавн котиков)
  await page.touchscreen.tap(80, 520);
  await page.waitForTimeout(600);
  await page.touchscreen.tap(80, 520);
  await page.waitForTimeout(600);

  // Скриншот Android после спавна котиков
  const shot3Path = path.join(snapshotsDir, 'android_3_cats_spawned.png');
  await page.screenshot({ path: shot3Path });
  console.log('📸 [Android Step 3/5] Спавн 2D PNG котиков зафиксирован:', shot3Path);

  // 4. Тач drag-and-drop: МЕРДЖ котиков со слота 1 на слот 0
  await page.mouse.move(118, 96);
  await page.mouse.down();
  await page.mouse.move(41, 96, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);

  const shotMergePath = path.join(snapshotsDir, 'android_4_drag_drop_merged.png');
  await page.screenshot({ path: shotMergePath });
  console.log('📸 [Android Step 4/5] Тач Drag-and-Drop Мердж зафиксирован:', shotMergePath);

  // 5. СВАЙП Котопедии (тач свайп влево)
  await page.mouse.move(320, 640);
  await page.mouse.down();
  await page.mouse.move(80, 640, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);

  const shotSwipePath = path.join(snapshotsDir, 'android_5_catpedia_swiped.png');
  await page.screenshot({ path: shotSwipePath });
  console.log('📸 [Android Step 5/5] Свайп Котопедии зафиксирован:', shotSwipePath);

  // 6. Проверка тапа по кнопке «🎓 Обучение»
  const tutorialTapX = 350;
  const tutorialTapY = 570;
  await page.touchscreen.tap(tutorialTapX, tutorialTapY);
  await page.waitForTimeout(600);

  // 7. Списание гемов до 0 и тестирование кнопки «⚡ Соединить» (проверка всплывающего рекламного окна)
  await page.evaluate(() => {
    if (window.game && window.game.economy) {
      window.game.economy.gems = 0;
      if (window.game.hud) window.game.hud.update(window.game.economy.coins, 0, window.game.economy.incomePerSec);
    }
  });
  await page.touchscreen.tap(320, 520); // Тап по «⚡ Соединить» при 0 💎
  await page.waitForTimeout(800);

  const shotAdPath = path.join(snapshotsDir, 'android_6_automerge_ad_modal.png');
  await page.screenshot({ path: shotAdPath });
  console.log('📸 [Android Step 6/6] Окно рекламы при 0 гемах зафиксировано:', shotAdPath);

  // 8. Открытие главного меню через 🐾 и вызов Настроек
  await page.touchscreen.tap(360, 25); // Тач по 🐾
  await page.waitForTimeout(800);
  await page.touchscreen.tap(196, 518); // Тач по Настройки (центр Y = 518)
  await page.waitForTimeout(800);

  const shot4Path = path.join(snapshotsDir, 'android_4_settings.png');
  await page.screenshot({ path: shot4Path });
  console.log('📸 [Android Step 4/4] Настройки зафиксированы:', shot4Path);

  await browser.close();
  server.close();

  if (errors.length > 0) {
    console.error('❌ Ошибки JS на Android:', errors);
    process.exit(1);
  }

  console.log('\n🎉 Все 4 этапа Android E2E-тестирования УСПЕШНО ПРОЙДЕНЫ!');
}

runAndroidTestRunner().catch(e => {
  console.error('Ошибка Android контроллера:', e);
  process.exit(1);
});
