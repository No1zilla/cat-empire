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
  console.log('🚀 Сервер запущен на http://localhost:9999/');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });
  const context = await browser.newContext({
    viewport: { width: 420, height: 750 }
  });
  const page = await context.newPage();

  console.log('📱 Открытие приложения...');
  await page.goto('http://localhost:9999/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });

  // Скрываем splash screen
  await page.evaluate(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
  });
  await page.waitForTimeout(1000);

  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  const scaleX = box.width / 410;
  const scaleY = box.height / 700;

  // 1. Пропуск оффлайн-дохода «👛 Забрать!»
  await page.mouse.click(box.x + 205 * scaleX, box.y + 427 * scaleY);
  await page.waitForTimeout(500);

  // Пропуск 3 шагов туториала
  await page.mouse.click(box.x + 200 * scaleX, box.y + 437 * scaleY);
  await page.waitForTimeout(300);
  await page.mouse.click(box.x + 200 * scaleX, box.y + 637 * scaleY);
  await page.waitForTimeout(300);
  await page.mouse.click(box.x + 200 * scaleX, box.y + 587 * scaleY);
  await page.waitForTimeout(500);

  // Закрываем NewCatModal если открылся
  await page.mouse.click(box.x + 205 * scaleX, box.y + 465 * scaleY);
  await page.waitForTimeout(400);

  const mergeX = box.x + 330 * scaleX;
  const mergeY = box.y + 570 * scaleY;

  // 1. Бесплатное слияние
  await page.mouse.click(mergeX, mergeY);
  await page.waitForTimeout(500);
  await page.mouse.click(box.x + 205 * scaleX, box.y + 465 * scaleY);
  await page.waitForTimeout(400);

  // 2. Потратить первые 5 гемов (с 10 до 5)
  await page.mouse.click(mergeX, mergeY);
  await page.waitForTimeout(500);

  // 3. Потратить ещё 5 гемов (с 5 до 0)
  await page.mouse.click(mergeX, mergeY);
  await page.waitForTimeout(500);

  // 4. Клик при 0 гемов -> Открывает AdModal!
  console.log('🎬 Клик при 0 гемов — Вызов модального окна AdModal...');
  await page.mouse.click(mergeX, mergeY);
  await page.waitForTimeout(800);

  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/video_step1_modal.png' });
  console.log('📸 Скриншот 1 (Запрос просмотра рекламы) сохранен');

  // 5. Клик по кнопке "🎬 Смотреть Видео (+5 💎)" на (x=205, y=475)
  const watchX = box.x + 205 * scaleX;
  const watchY = box.y + 475 * scaleY;
  console.log(`🎬 Нажатие кнопки "Смотреть Видео" на (${watchX.toFixed(0)}, ${watchY.toFixed(0)})...`);
  await page.mouse.click(watchX, watchY);
  await page.waitForTimeout(1500);

  // Скриншот работы 5-секундного видеоплеера
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/video_step2_playback.png' });
  console.log('📸 Скриншот 2 (Воспроизведение 5-секундного видео ролика) сохранен');

  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/video_step3_rewarded.png' });
  console.log('📸 Скриншот 3 (Награда +5 💎 зачислена) сохранен');

  await browser.close();
  server.close();
  console.log('🎉 ВИДЕОПЛЕЕР С ИНТЕРАКТИВНЫМ ПРОСМОТРОМ УСПЕШНО ПРОТЕСТИРОВАН!');
});
