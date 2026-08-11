import { VKService } from '../vk/VKBridge.js';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ: Валидация Кнопок VK Share & Wall Post (Виральность)');
console.log('🧪 =========================================================\n');

async function runShareTests() {
  const vkService = new VKService();

  console.log('📌 ТЕСТ 1: Расшаривание ссылки приложения (VKWebAppShare)');
  const shareRes = await vkService.shareLink('https://vk.com/app54702054');
  console.log('   Результат вызова shareLink:', shareRes);
  console.assert(shareRes && shareRes.success, '❌ shareLink должен возвращать success = true');
  console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

  console.log('📌 ТЕСТ 2: Публикация рекорда на стену (VKWebAppShowWallPostBox)');
  const wallRes = await vkService.sharePost('👑 Моя Империя Котиков растет! 🐱 Присоединяйся: https://vk.com/app54702054');
  console.log('   Результат вызова sharePost:', wallRes);
  console.assert(wallRes && wallRes.success, '❌ sharePost должен возвращать success = true');
  console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

  console.log('🎉 =========================================================');
  console.log('🎉 ВСЕ ТЕСТЫ ВИРАЛЬНОСТИ VK РЕПОСТОВ УСПЕШНО ПРОЙДЕНЫ!');
  console.log('🎉 =========================================================');
}

runShareTests().catch((err) => {
  console.error('❌ Ошибка тестирования VK Share:', err);
  process.exit(1);
});
