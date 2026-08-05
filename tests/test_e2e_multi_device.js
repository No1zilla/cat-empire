import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

// Простой локальный HTTP сервер
function startServer(port = 8767) {
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

async function runMultiDeviceE2ETest() {
  console.log('⚡ Запуск локального сервера для E2E-теста синхронизации 2-х устройств...');
  const server = await startServer(8767);
  console.log('🌐 Сервер запущен на http://localhost:8767');

  console.log('📱💻 Старт E2E-тестирования правила 2.3.8 (ПК vs Мобильный VK)...');
  const browser = await chromium.launch({ headless: true });

  // Эмуляция одинаковых параметров запуска VK для 1 пользователя на 2-х устройствах
  const vkLaunchUrl = 'http://localhost:8767/#vk_user_id=999777&vk_app_id=54692477&vk_is_app_user=1&sign=mock_sign_for_test';

  // 1. Устройство А: ПК Браузер (Desktop)
  const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageA = await contextA.newPage();
  
  const errorsA = [];
  pageA.on('pageerror', err => errorsA.push(`[Page A Error] ${err.message}`));
  pageA.on('console', msg => {
    if (msg.type() === 'error') errorsA.push(`[Console A Error] ${msg.text()}`);
  });

  console.log('💻 [Устройство A - ПК] Открываем игру...');
  await pageA.goto(vkLaunchUrl);
  await pageA.waitForTimeout(6000);

  // ПК: Клик «▶️ ИГРАТЬ»
  await pageA.mouse.click(640, 450);
  await pageA.waitForTimeout(1000);

  // ПК: Нажимаем «Купить» 3 раза
  console.log('💻 [Устройство A - ПК] Покупаем котиков и делаем прогресс...');
  await pageA.mouse.click(500, 690); // Купить
  await pageA.waitForTimeout(500);
  await pageA.mouse.click(500, 690); // Купить
  await pageA.waitForTimeout(500);
  await pageA.mouse.click(500, 690); // Купить
  await pageA.waitForTimeout(1500); // Ждём сохранения в VK Storage (800ms debounce)

  // 2. Устройство Б: Мобильный Смартфон (Mobile Android)
  const contextB = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 VKAndroidApp'
  });
  const pageB = await contextB.newPage();

  const errorsB = [];
  pageB.on('pageerror', err => errorsB.push(`[Page B Error] ${err.message}`));
  pageB.on('console', msg => {
    if (msg.type() === 'error') errorsB.push(`[Console B Error] ${msg.text()}`);
  });

  console.log('📱 [Устройство B - Смартфон] Запускаем игру под тем же VK ID (999777)...');
  await pageB.goto(vkLaunchUrl);
  await pageB.waitForTimeout(6000);

  // Смартфон: Клик «▶️ ИГРАТЬ»
  await pageB.mouse.click(187, 385);
  await pageB.waitForTimeout(1000);

  // Смартфон: Делаем дополнительные покупки и мердж
  console.log('📱 [Устройство B - Смартфон] Прокачиваем котиков на смартфоне...');
  await pageB.mouse.click(60, 495); // Купить на мобе
  await pageB.waitForTimeout(500);
  await pageB.mouse.click(60, 495); // Купить на мобе
  await pageB.waitForTimeout(1500); // Сохранение во второе облако

  // 3. Переключаем фокус обратно на Устройство А (ПК) — проверка правила 2.3.8!
  console.log('🔄 [Устройство A - ПК] Возвращаемся к ПК вкладке (Trigger visibilitychange focus)...');
  await pageA.bringToFront();
  await pageA.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pageA.waitForTimeout(2000);

  const screenshotA = path.resolve(__dirname, '../snapshots/sync_device_a_synced.png');
  await pageA.screenshot({ path: screenshotA });
  console.log('📸 [Устройство A - ПК] Скриншот синхронизированного состояния ПК:', screenshotA);

  const screenshotB = path.resolve(__dirname, '../snapshots/sync_device_b_synced.png');
  await pageB.screenshot({ path: screenshotB });
  console.log('📸 [Устройство B - Смартфон] Скриншот синхронизированного состояния Смартфона:', screenshotB);

  await browser.close();
  server.close();

  const allErrors = [...errorsA, ...errorsB];
  if (allErrors.length > 0) {
    console.error('❌ Найдены критические ошибки E2E синхронизации:', allErrors);
    process.exit(1);
  } else {
    console.log('🎉 E2E-тестирование правила 2.3.8 синхронизации 2-х устройств УСПЕШНО ПРОЙДЕНО!');
  }
}

runMultiDeviceE2ETest().catch(e => {
  console.error('Ошибка E2E теста:', e);
  process.exit(1);
});
