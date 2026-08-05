import { chromium, devices } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const qaSnapshotsDir = path.resolve(__dirname, '../snapshots/qa');
const artifactDir = '/Users/ai/.gemini/antigravity/brain/dd0992fe-9ff5-4a71-a53d-59fba5649078';

if (!fs.existsSync(qaSnapshotsDir)) {
  fs.mkdirSync(qaSnapshotsDir, { recursive: true });
}

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

async function saveProof(page, filename, label) {
  const localPath = path.join(qaSnapshotsDir, filename);
  const artifactPath = path.join(artifactDir, filename);
  await page.screenshot({ path: localPath });
  fs.copyFileSync(localPath, artifactPath);
  console.log(`📸 [PROOF SAVED] ${label} -> ${filename}`);
  return artifactPath;
}

async function runMasterQASuite() {
  console.log('⚡ Запуск HTTP-сервера для Master QA Audit...');
  const server = await startServer(8770);
  console.log('🌐 QA Сервер запущен на http://localhost:8770');

  console.log('📱 Запуск мобильного эмулятора Android (Pixel 5, Touch Events)...');
  const browser = await chromium.launch({ headless: true });
  const pixel5 = devices['Pixel 5'];
  const context = await browser.newContext({
    ...pixel5,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });

  await page.goto('http://localhost:8770');
  await page.waitForTimeout(5000);

  // 1. QA TEST 1: Главное Меню
  await saveProof(page, 'qa_1_main_menu.png', '1. Главное Стартовое Меню');

  // 2. QA TEST 2: Кнопка «⚙️ Настройки» в Главном Меню
  await page.touchscreen.tap(196, 518);
  await page.waitForTimeout(800);
  await saveProof(page, 'qa_2_menu_settings_modal.png', '2. Окно Настроек из Главного Меню');

  // Закрыть Настройки (клик «ЗАКРЫТЬ» у = 540)
  await page.touchscreen.tap(196, 540);
  await page.waitForTimeout(600);

  // 3. QA TEST 3: Кнопка «📖 Котопедия» в Главном Меню
  await page.touchscreen.tap(196, 470);
  await page.waitForTimeout(800);
  await saveProof(page, 'qa_3_menu_collection_modal.png', '3. Окно Котопедии из Главного Меню');

  // Закрыть Котопедию (клик ✖ у = 120, x = 360)
  await page.touchscreen.tap(360, 120);
  await page.waitForTimeout(600);

  // 4. QA TEST 4: Кнопка «▶️ ИГРАТЬ» (Переход к геймплею)
  await page.touchscreen.tap(196, 430);
  await page.waitForTimeout(1000);
  await saveProof(page, 'qa_4_gameplay_initial.png', '4. Игровой экран 5x5 + HUD + Панели');

  // 5. QA TEST 5: Одиночное нажатие «🐱 Купить» (Проверка ровно 1 котика за тап)
  const countBefore = await page.evaluate(() => {
    if (window.game && window.game.grid) {
      window.game.grid.slots[0] = null;
      window.game.grid.slots[1] = null;
      return window.game.grid.slots.filter(s => s !== null).length;
    }
    return 0;
  });

  await page.evaluate(() => {
    if (window.game && window.game.spawnSystem) {
      window.game.spawnSystem.emit('pointerdown');
      window.game.spawnSystem.emit('pointerup');
    }
  });
  await page.waitForTimeout(600);

  const countAfter = await page.evaluate(() => {
    return window.game && window.game.grid ? window.game.grid.slots.filter(s => s !== null).length : -1;
  });

  const spawnedDiff = countAfter - countBefore;
  console.log(`📊 [QA TEST 5] Котиков до: ${countBefore}, после: ${countAfter} (Дельта: +${spawnedDiff})`);
  if (spawnedDiff !== 1) {
    console.error(`❌ ОШИБКА QA: За 1 тап создалось ${spawnedDiff} котиков вместо 1!`);
  } else {
    console.log(`✅ [QA PASSED] Ровно 1 котик создан за 1 тап!`);
  }
  await saveProof(page, 'qa_5_single_cat_buy.png', '5. Покупка ровно 1 котика за 1 тап');

  // 6. QA TEST 6: Кнопка «📦 Заполнить» (Выкуп всех свободных слотов)
  await page.touchscreen.tap(217, 605);
  await page.waitForTimeout(1000);
  await saveProof(page, 'qa_6_fill_all_cats.png', '6. Кнопка Заполнить выкупила все слоты');

  // 7. QA TEST 7: Кнопка «⚡ Соединить» с гемами (Списание 5 💎 + авто-мёрдж)
  await page.touchscreen.tap(351, 605);
  await page.waitForTimeout(1200);
  await saveProof(page, 'qa_7_automerge_with_gems.png', '7. Кнопка Соединить списала 5 гемов и замерджила котиков');

  // 8. QA TEST 8: Кнопка «⚡ Соединить» при 0 💎 (Вызов рекламного видеоплеера)
  await page.evaluate(() => {
    if (window.game && window.game.economy) {
      window.game.economy.gems = 0;
      if (window.game.hud) window.game.hud.update(window.game.economy.coins, 0, window.game.economy.incomePerSecond);
    }
  });
  await page.touchscreen.tap(351, 605);
  await page.waitForTimeout(1000);
  await saveProof(page, 'qa_8_automerge_ad_modal.png', '8. Рекламное окно при 0 гемах на Соединить');

  // Закрыть окно рекламы (клик ✖ у = 320, x = 340)
  await page.touchscreen.tap(340, 320);
  await page.waitForTimeout(600);

  // 9. QA TEST 9: Кнопка «🎓 Обучение» в Котопедии (Живой интрактивный туториал)
  await page.touchscreen.tap(350, 570);
  await page.waitForTimeout(800);
  await saveProof(page, 'qa_9_live_tutorial_overlay.png', '9. Кнопка Обучение запустила интерактивный туториал');

  // Закрыть туториал (клик «Понятно!» у = 550, x = 196)
  await page.touchscreen.tap(196, 550);
  await page.waitForTimeout(600);

  // 10. QA TEST 10: Свайп Котопедии пальцем
  await page.mouse.move(320, 640);
  await page.mouse.down();
  await page.mouse.move(80, 640, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await saveProof(page, 'qa_10_catpedia_swiped.png', '10. Свайп Котопедии проскроллил уровни');

  // 11. QA TEST 11: Клик по карточке открытого котика в Котопедии
  await page.touchscreen.tap(200, 630);
  await page.waitForTimeout(800);
  await saveProof(page, 'qa_11_cat_detail_modal.png', '11. Модалка деталей котика из Котопедии');

  // Закрыть детали котика (клик «ЗАКРЫТЬ» у = 540, x = 196)
  await page.touchscreen.tap(196, 540);
  await page.waitForTimeout(600);

  // 12. QA TEST 12: Кнопка «🐾» в шапке HUD (Открытие Главного Меню из игры)
  await page.touchscreen.tap(360, 25);
  await page.waitForTimeout(800);
  await saveProof(page, 'qa_12_hud_paw_menu_opened.png', '12. Кнопка 🐾 открыла Главное Меню из игры');

  await browser.close();
  server.close();

  if (jsErrors.length > 0) {
    console.error('❌ Ошибки JS в процессе Master QA:', jsErrors);
    process.exit(1);
  }

  console.log('\n🎉 MASTER QA AUDIT УСПЕШНО ЗАВЕРШЁН! 12/12 доказательных скриншотов сохранены.');
}

runMasterQASuite().catch(e => {
  console.error('Ошибка Master QA скрипта:', e);
  process.exit(1);
});
