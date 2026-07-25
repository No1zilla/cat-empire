import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log('🚀 Запуск автоматического E2E тестирования...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 750 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
  });

  console.log('📱 Открытие приложения VK https://vk.ru/app54692477...');
  await page.goto('https://vk.ru/app54692477', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // Скриншот 1: Стартовый визуал
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/e2e_step1_start.png' });
  console.log('📸 Скриншот 1 сделан (e2e_step1_start.png)');

  // 2. Тест кликов на Canvas (Покупка котиков)
  console.log('🖱️ Тест покупки котиков (клик по кнопке Спавн)...');
  await page.mouse.click(75, 550);
  await page.waitForTimeout(500);
  await page.mouse.click(75, 550);
  await page.waitForTimeout(500);

  // Скриншот 2: После спавна
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/e2e_step2_spawn.png' });

  // 3. Тест Авто-слияния
  console.log('⚡ Тест авто-слияния...');
  await page.mouse.click(320, 550);
  await page.waitForTimeout(800);

  // 4. Перезагрузка и проверка персистентности
  console.log('🔄 Перезагрузка страницы для проверки сохранения...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // Скриншот 3: Финальный срез после перезагрузки
  await page.screenshot({ path: '/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/e2e_step3_reload.png' });

  await browser.close();

  console.log('\n📊 === РЕЗУЛЬТАТЫ E2E ТЕСТИРОВАНИЯ ===');
  console.log(`Ошибок в консоли: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Найденные ошибки:', consoleErrors);
  } else {
    console.log('✅ Ошибок в консоли браузера НЕ обнаружено!');
  }
})();
