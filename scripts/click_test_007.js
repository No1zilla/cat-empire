import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Запуск клик-за-кликом тестирования TASK-007...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 750 }
  });
  const page = await context.newPage();

  console.log('📱 Открытие https://vk.ru/app54692477...');
  await page.goto('https://vk.ru/app54692477', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // Скриншот 0: До кликов (Исходное состояние)
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/task007_click_0_baseline.png' });
  console.log('📸 Скриншот 0 (Исходное состояние) сохранен');

  // Клик 1: Первое бесплатное нажатие "⚡ Соединить" (x=330, y=550)
  console.log('🖱️ Клик 1: Нажатие "⚡ Соединить"...');
  await page.mouse.click(330, 550);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/task007_click_1_merge.png' });
  console.log('📸 Скриншот 1 (После Клика 1) сохранен');

  // Клик 2: Второе нажатие "⚡ Соединить" (списание гемов)
  console.log('🖱️ Клик 2: Повторное нажатие "⚡ Соединить"...');
  await page.mouse.click(330, 550);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/task007_click_2_gems.png' });
  console.log('📸 Скриншот 2 (После Клика 2) сохранен');

  // Клик 3: Третье нажатие (вызов Rewarded Ads при нулевом балансе)
  console.log('🖱️ Клик 3: Нажатие при нехватке гемов (просмотр рекламы)...');
  await page.mouse.click(330, 550);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/task007_click_3_rewarded.png' });
  console.log('📸 Скриншот 3 (После Клика 3 / Rewarded Ads) сохранен');

  await browser.close();
  console.log('✅ Клик-тест завершен успешно!');
})();
