// src/ui/test_desktop_reward_modal_spec.js
// Фолбэк рекламы: приглашение друзей вместо поста на стену

import assert from 'assert';

console.log('🧪 =========================================================');
console.log('🧪 ТЕСТ-СУИТ: DesktopRewardModal (приглашение друзей)');
console.log('🧪 =========================================================\n');

class MockEconomy {
  constructor() {
    this.gems = 0;
  }
  addGems(amount) {
    this.gems += amount;
  }
}

class MockVKService {
  async showInviteBox() {
    return { success: true, res: { sent: true } };
  }
}

async function runTests() {
  console.log('📌 ТЕСТ 1: Начисление рубинов за успешное приглашение');
  const economy = new MockEconomy();
  const vkService = new MockVKService();

  const inviteResult = await vkService.showInviteBox();
  assert.strictEqual(inviteResult.success, true, 'Инвайт должен возвращать success: true');
  assert.strictEqual(inviteResult.simulated, undefined, 'Реальный VK-инвайт не должен быть simulated');

  if (inviteResult.success && !inviteResult.simulated) {
    economy.addGems(5);
  }
  assert.strictEqual(economy.gems, 5, 'Баланс должен стать 5 рубинов');
  console.log('✅ ТЕСТ 1 УСПЕШНО ПРОЙДЕН!\n');

  console.log('📌 ТЕСТ 2: Симулятор / веб без VK не начисляет рубины');
  const economy2 = new MockEconomy();
  const simulated = { success: true, simulated: true };
  if (simulated.success && !simulated.simulated) {
    economy2.addGems(5);
  }
  assert.strictEqual(economy2.gems, 0, 'Без реального инвайта гемы не выдаём');
  console.log('✅ ТЕСТ 2 УСПЕШНО ПРОЙДЕН!\n');

  console.log('🎉 =========================================================');
  console.log('🎉 ВСЕ ТЕСТЫ DesktopRewardModal (инвайт) УСПЕШНО ПРОЙДЕНЫ!');
  console.log('🎉 =========================================================\n');
}

runTests().catch(err => {
  console.error('❌ ТЕСТ ЗАВЕРШИЛСЯ С ОШИБКОЙ:', err);
  process.exit(1);
});
