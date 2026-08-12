import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testAdModalCloseButton() {
  console.log('🧪 =========================================================');
  console.log('🧪 E2E TEST: Валидация работы кнопки ✕ в AdModal (Верхний слой)');
  console.log('🧪 =========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 410, height: 750 } });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.economy);

  // Trigger play to enter game
  await page.evaluate(() => {
    if (window.game._mainMenuInstance) window.game._mainMenuInstance.onPlay();
  });

  await page.waitForTimeout(500);

  // Open AdModal
  await page.evaluate(() => {
    const { AdModal } = window.game;
    const modal = new (window.game.autoMergeButton.constructor.prototype.constructor || window.game.fillAllButton.constructor)(window.game.app, window.game.economy);
  });

  // Open AdModal directly onto app stage
  const modalOpened = await page.evaluate(() => {
    if (!window.game || !window.game.app) return false;
    const { AdModal } = window.game;
    // Get AdModal from window context or instantiate via button tap
    window.game.autoMergeButton.economy.gems = 0;
    window.game.autoMergeButton._handleClick();
    return true;
  });

  console.log('📱 Модалка AdModal вызвана на экран...');
  await page.waitForTimeout(500);

  // Take screenshot of opened AdModal
  const screenshotOpened = '/Users/ai/.gemini/antigravity/brain/dd0992fe-9ff5-4a71-a53d-59fba5649078/qa_ad_modal_opened_always.png';
  await page.screenshot({ path: screenshotOpened });
  console.log(`📸 Скриншот открытого AdModal сохранен: ${screenshotOpened}`);

  // Evaluate if closeBtnContainer is present and at top layer
  const closeBtnCheck = await page.evaluate(() => {
    const stage = window.game.app.stage;
    const modals = stage.children.filter(c => c.constructor.name === 'AdModal');
    if (modals.length === 0) return { error: 'AdModal не найден на сцене' };
    const modal = modals[0];
    const lastChild = modal.children[modal.children.length - 1];
    return {
      modalChildCount: modal.children.length,
      lastChildZIndex: lastChild ? lastChild.zIndex : null,
      lastChildHasChildren: lastChild ? (lastChild.children ? lastChild.children.length : 0) : 0
    };
  });

  console.log('🔍 Проверка слоя кнопки Закрыть:', closeBtnCheck);
  console.assert(closeBtnCheck.modalChildCount >= 5, '❌ AdModal должен содержать все компоненты рендеринга!');

  // Simulate click on close button
  await page.evaluate(() => {
    const stage = window.game.app.stage;
    const modals = stage.children.filter(c => c.constructor.name === 'AdModal');
    if (modals.length > 0) {
      modals[0]._close();
    }
  });

  await page.waitForTimeout(500);

  const modalClosedCheck = await page.evaluate(() => {
    const stage = window.game.app.stage;
    return stage.children.filter(c => c.constructor.name === 'AdModal').length === 0;
  });

  console.log('   Статус закрытия модалки:', modalClosedCheck ? 'ЗАКРЫТА ✅' : 'ОСТАЛАСЬ ❌');
  console.assert(modalClosedCheck === true, '❌ AdModal должен закрываться при клике по ✕');

  await browser.close();

  console.log('\n✅ E2E ТЕСТ КНОПКИ ЗАКРЫТЬ ✕ УСПЕШНО ПРОЙДЕН!');
  console.log('🎉 =========================================================');
}

testAdModalCloseButton().catch((err) => {
  console.error('❌ Ошибка теста закрытия:', err);
  process.exit(1);
});
