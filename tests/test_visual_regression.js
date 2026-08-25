import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import {
  DIFFS_DIR,
  SCENES,
  SNAPSHOTS_DIR,
  assertDistBuilt,
  captureScene,
  comparePngs,
  ensureDir,
  openGamePage,
  startStaticServer
} from './helpers/visualHarness.js';

/**
 * Попиксельное сравнение текущего рендера с золотыми эталонами.
 * Сценарии и заморозка сцены берутся из общего харнеса, чтобы флоу
 * генератора и флоу проверки не разъезжались (из-за этого сюита и сгнила).
 */
const PORT = 8769;

async function run() {
  assertDistBuilt();
  ensureDir(DIFFS_DIR);

  console.log('⚡ Запуск HTTP-сервера для Visual Regression Test...');
  const server = await startStaticServer(PORT);
  console.log(`🌐 Сервер запущен на http://localhost:${PORT}`);

  console.log('🔍 Запуск Visual Pixel-by-Pixel Audit (сравнение с эталонами)...');
  const browser = await chromium.launch({ headless: true });
  const { page, errors } = await openGamePage(browser, PORT);
  // Отдельная пустая вкладка под сравнение картинок: замороженную сцену не трогаем.
  const comparePage = await (await browser.newContext()).newPage();
  await comparePage.goto('about:blank');

  let passedCount = 0;
  let failedCount = 0;

  for (const scene of SCENES) {
    const goldenPath = path.join(SNAPSHOTS_DIR, scene.goldenFile);
    const fresh = await captureScene(page, scene);

    if (!fs.existsSync(goldenPath)) {
      console.error(`❌ Эталон ${scene.goldenFile} не найден — запустите tests/test_visual_snapshots.js`);
      failedCount++;
      continue;
    }

    const golden = fs.readFileSync(goldenPath);
    const diff = await comparePngs(comparePage, golden, fresh);

    if (diff.sizeMismatch) {
      console.error(
        `❌ [SIZE MISMATCH] ${scene.name}: эталон ${diff.sizeA}, текущий кадр ${diff.sizeB}`
      );
      fs.writeFileSync(path.join(DIFFS_DIR, `failed_${scene.goldenFile}`), fresh);
      failedCount++;
      continue;
    }

    if (diff.diffRatio < scene.maxDiff) {
      console.log(
        `✅ [MATCH] ${scene.name}: совпадение ${(100 - diff.diffRatio).toFixed(2)}% ` +
          `(различие ${diff.diffRatio.toFixed(2)}% при допуске ${scene.maxDiff}%)`
      );
      passedCount++;
    } else {
      console.error(
        `❌ [VISUAL DIFF DETECTED] ${scene.name}: вёрстка разъехалась на ` +
          `${diff.diffRatio.toFixed(2)}% (${diff.pixelDiffs} пикселей, допуск ${scene.maxDiff}%)`
      );
      const diffPath = path.join(DIFFS_DIR, `failed_${scene.goldenFile}`);
      fs.writeFileSync(diffPath, fresh);
      console.error(`📸 Разъехавшийся кадр сохранён для отладки: ${diffPath}`);
      failedCount++;
    }
  }

  await browser.close();
  server.close();

  if (errors.length > 0) {
    console.error('⚠️ Ошибки JS на странице во время съёмки:', errors);
  }

  console.log('\n========================================');
  console.log('📊 ИТОГИ ПОПИКСЕЛЬНОГО ВИЗУАЛЬНОГО ТЕСТИРОВАНИЯ:');
  console.log(`✅ Прошло: ${passedCount} / ${SCENES.length}`);
  console.log(`❌ Ошибок: ${failedCount} / ${SCENES.length}`);
  console.log('========================================\n');

  if (failedCount > 0 || errors.length > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Ошибка визуального контроллера:', e);
  process.exit(1);
});
