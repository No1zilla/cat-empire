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
function startServer(port = 8770) {
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
  const server = await startServer(8770);
  console.log('🌐 Сервер запущен на http://localhost:8770');

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

  await page.goto('http://localhost:8770');
  await page.waitForTimeout(6000);

  // 1. Скриншот Android: Главное меню
  const shot1Path = path.join(snapshotsDir, 'android_1_main_menu.png');
  await page.screenshot({ path: shot1Path });
  console.log('📸 [Android Step 1/4] Главное меню зафиксировано:', shot1Path);

  // 2. Тач-клик по «▶️ ИГРАТЬ» в центре экрана (X = 196, Y = 430 на Pixel 5)
  await page.touchscreen.tap(196, 430);
  await page.waitForTimeout(1500);

  // Скриншот Android: Игровой экран
  const shot2Path = path.join(snapshotsDir, 'android_2_gameplay.png');
  await page.screenshot({ path: shot2Path });
  console.log('📸 [Android Step 2/4] Игровой экран зафиксирован:', shot2Path);

  // 3. Тач-клик по «🐱 Купить» (Нижняя левая кнопка)
  await page.touchscreen.tap(80, 520);
  await page.waitForTimeout(600);
  await page.touchscreen.tap(80, 520);
  await page.waitForTimeout(600);

  // Скриншот Android после спавна котиков
  const shot3Path = path.join(snapshotsDir, 'android_3_cats_spawned.png');
  await page.screenshot({ path: shot3Path });
  console.log('📸 [Android Step 3/4] Спавн котиков зафиксирован:', shot3Path);

  // 4. Открытие главного меню через 🐾 и вызов Настроек
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
