import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import {
  SCENES,
  SNAPSHOTS_DIR,
  assertDistBuilt,
  captureScene,
  ensureDir,
  openGamePage,
  startStaticServer
} from './helpers/visualHarness.js';

/**
 * Генератор золотых эталонов.
 *
 * ВНИМАНИЕ: запуск объявляет текущий вид игры нормой. Перед коммитом
 * глазами проверьте каждый PNG — файл с именем main_menu обязан быть меню,
 * а не игровым полем (ровно так эталоны и протухли, см. TASK-095).
 */
const PORT = 8766;

async function run() {
  assertDistBuilt();
  ensureDir(SNAPSHOTS_DIR);

  console.log('⚡ Запуск локального сервера для визуального тестирования...');
  const server = await startStaticServer(PORT);
  console.log(`🌐 Сервер запущен на http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const { page, errors } = await openGamePage(browser, PORT);

  let index = 0;
  for (const scene of SCENES) {
    index++;
    const buffer = await captureScene(page, scene);
    const target = path.join(SNAPSHOTS_DIR, scene.goldenFile);
    fs.writeFileSync(target, buffer);
    console.log(`✅ [Snapshot ${index}/${SCENES.length}] ${scene.name} → ${scene.goldenFile}`);
  }

  await browser.close();
  server.close();

  if (errors.length > 0) {
    console.error('❌ Найдены критические ошибки JS при создании снапшотов:', errors);
    process.exit(1);
  }
  console.log(`🎉 Все ${SCENES.length} золотых Visual Snapshots зафиксированы.`);
  console.log('👀 Просмотрите PNG глазами: перегенерация делает текущий UI эталоном.');
}

run().catch((e) => {
  console.error('Ошибка визуального теста:', e);
  process.exit(1);
});
