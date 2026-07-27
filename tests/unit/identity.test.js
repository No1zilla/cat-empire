import assert from 'node:assert';
import { VkIdentity } from '../../src/services/VkIdentity.js';

export async function runIdentityTests() {
  console.log('🧪 Тестирование Кросс-Платформенной Идентификации (src/services/VkIdentity.js)...');

  const identity = new VkIdentity();

  // Имитация URL Search
  global.window = {
    location: {
      search: '?vk_user_id=777888999',
      hash: ''
    }
  };

  const idFromSearch = await identity.getVkUserId();
  assert.strictEqual(idFromSearch, '777888999', 'VkIdentity должен извлекать id из query string');

  // Имитация URL Hash при отсутствии search
  const identityHash = new VkIdentity();
  global.window = {
    location: {
      search: '',
      hash: '#vk_user_id=111222333'
    }
  };
  const idFromHash = await identityHash.getVkUserId();
  assert.strictEqual(idFromHash, '111222333', 'VkIdentity должен извлекать id из URL hash на мобильных');

  console.log('  ✅ Единый модуль идентификации VkIdentity прошел все авто-тесты!');
}
