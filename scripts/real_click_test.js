import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/' || reqUrl === '/cat-empire/' || reqUrl === '/cat-empire') {
    reqUrl = '/index.html';
  }
  reqUrl = reqUrl.replace(/^\/cat-empire/, '');

  let filePath = path.join(distDir, reqUrl);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(9999, async () => {
  console.log('🚀 Встроенный HTTP-сервер запущен на http://localhost:9999/');

  // Используем систему с поддержкой WebGL
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--no-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 420, height: 750 }
  });
  const page = await context.newPage();

  page.on('console', (msg) => console.log('LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('ERR:', err));

  console.log('📱 Переход на http://localhost:9999/...');
  await page.goto('http://localhost:9999/', { waitUntil: 'domcontentloaded' });

  console.log('⏳ Ожидание появления Canvas...');
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });

  // Удаляем splash экран для чистых снимков
  await page.evaluate(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
  });
  await page.waitForTimeout(1000);

  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  console.log(`📐 Canvas найден: x=${box.x.toFixed(1)}, y=${box.y.toFixed(1)}, w=${box.width.toFixed(1)}, h=${box.height.toFixed(1)}`);

  const scaleX = box.width / 410;
  const scaleY = box.height / 700;

  // Скриншот 0: Базовый состояние
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/distinct_step0_baseline.png' });
  console.log('📸 Step 0 (Исходное состояние) сохранен');

  // Клик 1: Покупка первого кота (x=70, y=545)
  const buyX = box.x + 70 * scaleX;
  const buyY = box.y + 545 * scaleY;
  console.log(`🖱️ Клик 1 по кнопке Купить (${buyX.toFixed(0)}, ${buyY.toFixed(0)})...`);
  await page.mouse.click(buyX, buyY);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/distinct_step1_buy1.png' });
  console.log('📸 Step 1 (Покупка 1-го кота) сохранен');

  // Клик 2: Покупка второго кота
  console.log('🖱️ Клик 2 по кнопке Купить...');
  await page.mouse.click(buyX, buyY);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/distinct_step2_buy2.png' });
  console.log('📸 Step 2 (Покупка 2-го кота) сохранен');

  // Клик 3: Авто-слияние (x=330, y=545)
  const mergeX = box.x + 330 * scaleX;
  const mergeY = box.y + 545 * scaleY;
  console.log(`⚡ Клик 3 по кнопке Соединить (${mergeX.toFixed(0)}, ${mergeY.toFixed(0)})...`);
  await page.mouse.click(mergeX, mergeY);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/distinct_step3_automerge.png' });
  console.log('📸 Step 3 (Авто-слияние) сохранен');

  await browser.close();
  server.close();
  console.log('🎉 ВСЕ 4 УНИКАЛЬНЫХ ПОШАГОВЫХ СКРИНШОТА СНЯТЫ!');
});
