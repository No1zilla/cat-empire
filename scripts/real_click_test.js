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

  // 1. Скриншот 0: Экран при входе (Оффлайн доход / Туториал)
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/tut_step0_tutorial.png' });
  console.log('📸 Step 0 (Стартовое окно/Туториал) сохранен');

  // Клик 1: Пропуск оффлайн-дохода «👛 Забрать!»
  const claimX = box.x + 205 * scaleX;
  const claimY = box.y + 427 * scaleY;
  await page.mouse.click(claimX, claimY);
  await page.waitForTimeout(500);

  // Проход по всем 3 шагам туториала «Понятно! →»
  // Шаг 1: кнопка Понятно на y=437
  await page.mouse.click(box.x + 200 * scaleX, box.y + 437 * scaleY);
  await page.waitForTimeout(500);

  // Шаг 2: кнопка Понятно на y=637
  await page.mouse.click(box.x + 200 * scaleX, box.y + 637 * scaleY);
  await page.waitForTimeout(500);

  // Шаг 3: кнопка Понятно на y=587
  await page.mouse.click(box.x + 200 * scaleX, box.y + 587 * scaleY);
  await page.waitForTimeout(600);

  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/tut_step1_unlocked.png' });
  console.log('📸 Step 1 (Туториал пройден, чистая сетка) сохранен');

  // 2. Покупка двух котиков 1 уровня для DND теста
  const buyX = box.x + 75 * scaleX;
  const buyY = box.y + 570 * scaleY;
  console.log('🖱️ Покупка 2-х котиков для Drag-and-Drop...');
  await page.mouse.click(buyX, buyY);
  await page.waitForTimeout(600);
  await page.mouse.click(buyX, buyY);
  await page.waitForTimeout(600);

  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/tut_step2_cats_spawned.png' });
  console.log('📸 Step 2 (Коты заспавнены для перетаскивания) сохранен');

  // 3. РЕАЛЬНОЕ ПЕРЕТАСКИВАНИЕ МЫШЬЮ (Drag & Drop)
  // Слоты сетки 5х5:
  // Slot 0 (x=50, y=140) -> Slot 1 (x=128, y=140)
  const slot0X = box.x + 50 * scaleX;
  const slot0Y = box.y + 140 * scaleY;
  const slot1X = box.x + 128 * scaleX;
  const slot1Y = box.y + 140 * scaleY;

  console.log(`🔀 ПЕРЕТАСКИВАНИЕ КОТИКА: с (${slot0X.toFixed(0)}, ${slot0Y.toFixed(0)}) на (${slot1X.toFixed(0)}, ${slot1Y.toFixed(0)})...`);
  
  await page.mouse.move(slot0X, slot0Y);
  await page.mouse.down();
  await page.waitForTimeout(200);

  // Плавная проводка мыши для визуального перетаскивания
  for (let i = 1; i <= 10; i++) {
    const curX = slot0X + (slot1X - slot0X) * (i / 10);
    const curY = slot0Y + (slot1Y - slot0Y) * (i / 10);
    await page.mouse.move(curX, curY);
    await page.waitForTimeout(30);
  }

  await page.mouse.up();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/tut_step3_dnd_merged.png' });
  console.log('📸 Step 3 (Результат перетаскивания DND) сохранен');

  await browser.close();
  server.close();
  console.log('🎉 ТЕСТ ПЕРЕТАСКИВАНИЯ (DRAG & DROP) И ПРОХОДА ТУТОРИАЛА ЗАВЕРШЁН!');
});
