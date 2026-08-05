import { chromium } from 'playwright';
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

// Простой локальный HTTP сервер
function startServer(port = 8766) {
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

async function runVisualTests() {
  console.log('⚡ Запуск локального сервера для визуального тестирования...');
  const server = await startServer(8766);
  console.log('🌐 Сервер запущен на http://localhost:8766');

  console.log('🎨 Запуск Visual Snapshot Testing...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8766');
  // Ждём полной загрузки и склеивания спрайтов
  await page.waitForTimeout(6000);

  // 1. Скриншот: Главное Стартовое Меню
  const mainMenuPath = path.join(snapshotsDir, 'golden_main_menu.png');
  await page.screenshot({ path: mainMenuPath });
  console.log('✅ [Snapshot 1/4] Главное Меню зафиксировано:', mainMenuPath);

  // 2. Клик «▶️ ИГРАТЬ» -> Открытие игрового экрана
  await page.mouse.click(187, 385);
  await page.waitForTimeout(1000);

  // 3. Скриншот: Шапка HUD (капсулы монет, гемов, дохода, меню)
  const hudPath = path.join(snapshotsDir, 'golden_hud_header.png');
  await page.screenshot({ path: hudPath, clip: { x: 0, y: 0, width: 375, height: 60 } });
  console.log('✅ [Snapshot 2/4] Шапка HUD зафиксирована (clip 375x60):', hudPath);

  // 4. Скриншот: Полный игровой экран и сетка 5x5
  const gameplayPath = path.join(snapshotsDir, 'golden_gameplay_grid.png');
  await page.screenshot({ path: gameplayPath });
  console.log('✅ [Snapshot 3/4] Игровой экран зафиксирован:', gameplayPath);

  // 5. Клик по «⚙️ НАСТРОЙКИ» в Главном Меню (открываем меню -> клик настройки)
  await page.mouse.click(340, 25); // Клик по 🏠
  await page.waitForTimeout(600);
  await page.mouse.click(187, 495); // Клик по Настройки
  await page.waitForTimeout(600);

  const settingsPath = path.join(snapshotsDir, 'golden_settings_modal.png');
  await page.screenshot({ path: settingsPath });
  console.log('✅ [Snapshot 4/4] Окно Настроек зафиксировано:', settingsPath);

  await browser.close();
  server.close();

  if (errors.length > 0) {
    console.error('❌ Найдены критические ошибки JS при создании снапшотов:', errors);
    process.exit(1);
  } else {
    console.log('🎉 Все 4 золотых Visual Snapshots успешно зафиксированы и проверены!');
  }
}

runVisualTests().catch(e => {
  console.error('Ошибка визуального теста:', e);
  process.exit(1);
});
