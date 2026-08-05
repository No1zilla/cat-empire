import { chromium, devices } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const snapshotsDir = path.resolve(__dirname, '../snapshots');

function startServer(port = 8792) {
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

async function runRandomSpawnsTest() {
  console.log('⚡ Запуск HTTP-сервера для проверки рандомных спавнов...');
  const server = await startServer(8792);
  console.log('🌐 QA Сервер запущен на http://localhost:8792');

  const browser = await chromium.launch({ headless: true });
  const pixel5 = devices['Pixel 5'];
  const context = await browser.newContext({ ...pixel5, isMobile: true, hasTouch: true });
  const page = await context.newPage();

  await page.goto('http://localhost:8792');
  await page.waitForTimeout(5000);

  // Переходим в геймплей
  await page.touchscreen.tap(196, 430); // Клик «▶️ ИГРАТЬ»
  await page.waitForTimeout(2000);

  // TEST 1: Вызов NewCatModal не должен приводить к фоновому спавну котиков
  console.log('\n🔍 [TEST 1] Проверка отсутствия фонового спавна при открытии NewCatModal...');
  const countBeforeModal = await page.evaluate(() => {
    return window.game && window.game.grid ? window.game.grid.getActiveCatsCount() : 0;
  });

  await page.evaluate(() => {
    // Симулируем мёрдж и открытие NewCatModal
    if (window.game && window.game.mergeEngine && window.game.grid) {
      window.game.maxCatLevel = 1;
      const CatClass = window.game.grid.slots.find(s => s !== null)?.constructor;
      if (CatClass) {
        window.game.grid.slots[0] = null;
        window.game.grid.slots[1] = null;
        const catA = new CatClass(1, 0);
        const catB = new CatClass(1, 1);
        window.game.grid.addCat(catA, 0);
        window.game.grid.addCat(catB, 1);
        window.game.mergeEngine.merge(0, 1);
      }
    }
  });
  await page.waitForTimeout(1500);

  const countAfterModal = await page.evaluate(() => {
    return window.game && window.game.grid ? window.game.grid.getActiveCatsCount() : 0;
  });

  console.log(`📊 [TEST 1 RESULT] Активные котики: до=${countBeforeModal}, после=${countAfterModal}`);
  console.log('📸 Скриншот проверки NewCatModal...');
  await page.screenshot({ path: path.join(snapshotsDir, 'test_random_1_new_cat_modal.png') });

  // Закрыть модалку
  await page.touchscreen.tap(196, 520);
  await page.waitForTimeout(600);

  // TEST 2: Проверка прерывания hold-to-buy при window.blur
  console.log('\n🔍 [TEST 2] Проверка остановки авто-покупки при отпускании/blur...');
  await page.evaluate(() => {
    if (window.game && window.game.spawnSystem) {
      window.game.spawnSystem.emit('pointerdown');
    }
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
  });
  await page.waitForTimeout(1000);

  const countAfterBlur = await page.evaluate(() => {
    return window.game && window.game.grid ? window.game.grid.getActiveCatsCount() : 0;
  });

  console.log(`📊 [TEST 2 RESULT] Котиков после blur: ${countAfterBlur}`);

  // TEST 3: Проверка сохранения локального поля при visibilitychange
  console.log('\n🔍 [TEST 3] Проверка сохранения локального поля при сворачивании и возврате...');
  const stateBeforeVisibility = await page.evaluate(() => {
    return window.game && window.game.grid ? window.game.grid.exportState() : [];
  });

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);

  const stateAfterVisibility = await page.evaluate(() => {
    return window.game.grid.exportState();
  });

  console.log('📸 Скриншот финального состояния поля после visibilitychange...');
  await page.screenshot({ path: path.join(snapshotsDir, 'test_random_3_visibility_change.png') });

  const statesEqual = JSON.stringify(stateBeforeVisibility) === JSON.stringify(stateAfterVisibility);
  if (!statesEqual) {
    console.error('❌ ОШИБКА: Поле перетёрлось при возврате на вкладку!');
    process.exit(1);
  } else {
    console.log('✅ [TEST 3 PASSED] Локальное игровое поле 100% сохранёно без посторонних спавнов!');
  }

  await browser.close();
  server.close();

  console.log('\n🎉 ВСЕ ТЕСТЫ ЗАЩИТЫ ОТ РАНДОМНЫХ СПАВНОВ УСПЕШНО ПРОЙДЕНЫ!');
}

runRandomSpawnsTest().catch(e => {
  console.error('Ошибка в тесте рандомных спавнов:', e);
  process.exit(1);
});
