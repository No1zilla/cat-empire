import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../../dist');

// Простой локальный HTTP сервер для раздачи dist
function startServer(port = 8765) {
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

async function runTest() {
  console.log('⚡ Запуск локального HTTP-сервера для dist...');
  const server = await startServer(8765);
  console.log('🌐 Сервер запущен на http://localhost:8765');

  console.log('🧪 Запуск автоматического тестирования Главного Меню (Playwright)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();

  const errors = [];
  const logs = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8765');
  await page.waitForTimeout(7000);

  // Скриншот Главного Меню
  const screenshotPath1 = path.resolve(__dirname, '../main_menu_screenshot.png');
  await page.screenshot({ path: screenshotPath1 });
  console.log('📸 Скриншот Главного Меню сохранён:', screenshotPath1);

  // Клик по кнопке «▶️ ИГРАТЬ» (в центре меню)
  await page.mouse.click(187, 385);
  await page.waitForTimeout(1000);

  // Скриншот Игрового экрана
  const screenshotPath2 = path.resolve(__dirname, '../gameplay_screenshot.png');
  await page.screenshot({ path: screenshotPath2 });
  console.log('📸 Скриншот Игрового экрана сохранён:', screenshotPath2);

  // Клик по кнопке «🏠» в шапке HUD (справа вверху: X = 340, Y = 25)
  await page.mouse.click(340, 25);
  await page.waitForTimeout(1000);

  // Скриншот Возврата в Меню
  const screenshotPath3 = path.resolve(__dirname, '../returned_menu_screenshot.png');
  await page.screenshot({ path: screenshotPath3 });
  console.log('📸 Скриншот возврата в Главное Меню сохранён:', screenshotPath3);

  await browser.close();
  server.close();

  console.log('📜 Логи приложения:');
  logs.forEach(l => console.log('  ', l));

  if (errors.length > 0) {
    console.error('❌ Ошибки консоли:', errors);
    process.exit(1);
  } else {
    console.log('🎉 Все тесты пройдены без единой ошибки!');
  }
}

runTest().catch(e => {
  console.error('Ошибка теста:', e);
  process.exit(1);
});
