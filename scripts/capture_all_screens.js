import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/ai/.gemini/antigravity/brain/dd0992fe-9ff5-4a71-a53d-59fba5649078';

(async () => {
  console.log('📸 Launching Playwright to capture screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }, // iPhone 15 Pro Max dimensions
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Main Menu
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'current_main_menu.png') });
  console.log('✅ Main Menu captured');

  // Click Play to enter Gameplay
  const canvas = await page.$('canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await page.waitForTimeout(1000);
  }

  // 2. Gameplay Initial
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'current_gameplay.png') });
  console.log('✅ Gameplay captured');

  // Open Settings Modal
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.05);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_2_menu_settings_modal.png') });
  console.log('✅ Settings Modal captured');

  // Close Settings
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.7);
    await page.waitForTimeout(600);
  }

  // Open Collection / Catpedia
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.1, box.y + box.height * 0.05);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_3_menu_collection_modal.png') });
  console.log('✅ Collection Modal captured');

  // Click Cat in collection to open Cat Detail Modal
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.35);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_11_cat_detail_modal.png') });
  console.log('✅ Cat Detail Modal captured');

  // Close Detail & Collection
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.8);
    await page.waitForTimeout(500);
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.8);
    await page.waitForTimeout(500);
  }

  // Open Ad Modal
  await page.evaluate(() => {
    if (window.game && window.game.app && window.game.app.stage) {
      import('/src/ui/AdModal.js').then(({ AdModal }) => {
        const modal = new AdModal(window.game.app, window.game.economy, () => {}, 0);
        modal.zIndex = 999999;
        window.game.app.stage.addChild(modal);
      });
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_8_automerge_ad_modal.png') });
  console.log('✅ Ad Modal captured');

  await browser.close();
  console.log('📸 All screenshots captured successfully!');
})();
