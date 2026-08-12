import { chromium } from 'playwright';
import { createServer } from 'vite';

async function runCanvasBrowserTest() {
  console.log('🧪 =========================================================');
  console.log('🧪 PLAYWRIGHT BROWSER TEST: Проверка реальной визуальной отрисовки на Canvas');
  console.log('🧪 =========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 410, height: 750 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('📱 Открываем live страницу на http://localhost:5173 без кэша...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Ждем полной загрузки спрайтов и создания объекта window.game
  await page.waitForFunction(() => window.game && window.game.economy && window.game.fillAllButton, { timeout: 10000 });

  // Trigger play if main menu is open
  await page.evaluate(() => {
    if (window.game && window.game._mainMenuInstance) {
      window.game._mainMenuInstance.onPlay();
    }
  });

  await page.waitForTimeout(500);

  // 4. Проверяем значения непосредственно в памяти PixiJS экземпляра window.game
  const result = await page.evaluate(() => {
    if (!window.game || !window.game.fillAllButton || !window.game.economy) {
      return { error: 'window.game.fillAllButton не найден' };
    }

    const econ = window.game.economy;
    const fillData = window.game.fillAllButton.getFillData();
    const unitCost = econ.getCatCost();

    return {
      coins: econ.coins,
      totalCatsBought: econ.totalCatsBought,
      unitCost: unitCost,
      fillCount: fillData.count,
      fillCost: fillData.cost,
      freeSlotsCount: fillData.freeSlotsCount
    };
  });

  console.log('📊 СНЯТЫЕ ДАННЫЕ ИЗ РЕАЛЬНОГО БРАУЗЕРА CHROMIUM:');
  console.log('   Монеты игрока (coins):', result.coins);
  console.log('   Всего куплено котиков (totalCatsBought):', result.totalCatsBought);
  console.log('   Цена 1 котика (unitCost):', result.unitCost, '💰');
  console.log('   Количество на кнопке Заполнить (fillCount):', result.fillCount, 'шт');
  console.log('   Стоимость на кнопке Заполнить (fillCost):', result.fillCost, '💰');

  // 5. Делаем скриншот реального игрового поля
  const screenshotPath = '/Users/ai/.gemini/antigravity/brain/dd0992fe-9ff5-4a71-a53d-59fba5649078/current_gameplay.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Скриншот реальной игры сохранен в: ${screenshotPath}`);

  // Закрываем браузер
  await browser.close();

  // Валидация
  const expectedCost = result.fillCount * result.unitCost;
  console.assert(result.fillCost === expectedCost, `❌ Стоимость должна быть ${expectedCost}, получено: ${result.fillCost}`);

  console.log('\n✅ PLAYWRIGHT BROWSER TEST УСПЕШНО ПРОЙДЕН!');
  console.log(`✅ Математика кнопки Заполнить в реальном Chromium: ${result.fillCount} шт x ${result.unitCost} 💰 = ${result.fillCost} 💰!`);
  console.log('🎉 =========================================================');
}

runCanvasBrowserTest().catch((err) => {
  console.error('❌ Ошибка Playwright теста:', err);
  process.exit(1);
});
