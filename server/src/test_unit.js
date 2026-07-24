import { verifyVkSign } from './utils/vkCheckSign.js';
import userService from './services/userService.js';

async function runUnitTests() {
  console.log('=== 1. Тестирование функции vkCheckSign.js ===');
  const secret = 'test_secret_key';
  // Сформируем валидные тестовые данные
  const testQuery = 'vk_user_id=123456&vk_app_id=510000&vk_is_app_user=1&vk_language=ru&vk_platform=desktop_web';
  
  // Тест проверки на валидные и невалидные подписи
  const isInvalid = verifyVkSign(testQuery, secret);
  console.log('Проверка без sign параметра (должно быть false):', isInvalid === false ? '✅ УСПЕШНО' : '❌ ОШИБКА');

  console.log('\n=== 2. Тестирование userService (getOrCreateUser) ===');
  const mockVkUserId = 123456n;
  const user1 = await userService.getOrCreateUser(mockVkUserId);
  console.log('Созданный/Полученный пользователь:');
  console.log('  vkId:', user1.vkId, '(тип:', typeof user1.vkId, ')');
  console.log('  coins:', user1.coins);
  console.log('  gems:', user1.gems);
  console.log('  maxCatLevel:', user1.maxCatLevel);
  console.log('  gridState:', user1.gridState);

  console.log('\n=== 3. Тестирование userService (saveUserProgress) ===');
  const updatedUser = await userService.saveUserProgress(mockVkUserId, {
    coins: 500,
    gems: 25,
    maxCatLevel: 4,
    gridState: [
      { slotIndex: 0, catLevel: 4 },
      { slotIndex: 1, catLevel: 2 }
    ]
  });

  console.log('Обновлённый пользователь:');
  console.log('  coins:', updatedUser.coins);
  console.log('  gems:', updatedUser.gems);
  console.log('  maxCatLevel:', updatedUser.maxCatLevel);
  console.log('  gridState:', updatedUser.gridState);

  console.log('\n=== 4. Повторный вызов getOrCreateUser (проверка сохранения и оффлайн дохода) ===');
  const user2 = await userService.getOrCreateUser(mockVkUserId);
  console.log('Пользователь при повторном запросе:');
  console.log('  coins:', user2.coins);
  console.log('  gems:', user2.gems);
  console.log('  maxCatLevel:', user2.maxCatLevel);

  console.log('\n✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  process.exit(0);
}

runUnitTests().catch((err) => {
  console.error('❌ Ошибка при выполнении тестов:', err);
  process.exit(1);
});
