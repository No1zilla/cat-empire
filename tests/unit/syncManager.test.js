import assert from 'node:assert';
import { SyncManager } from '../../src/services/SyncManager.js';

export async function runSyncManagerTests() {
  console.log('🧪 Тестирование Архитектурного Менеджера Синхронизации (SyncManager.js)...');

  const manager = new SyncManager();
  assert.strictEqual(manager.isInitialized, false, 'До инициализации сессии флаг isInitialized должен быть false');

  // Мокирование глобальных зависимостей
  global.window = {
    location: { search: '?vk_user_id=123456789', hash: '' }
  };

  const state = await manager.initializeSession();
  assert.strictEqual(manager.isInitialized, true, 'После успешной инициализации флаг isInitialized должен быть true');
  assert.strictEqual(manager.currentVkId, '123456789', 'SyncManager должен корректно связывать текущую сессию с VK ID');
  assert.ok(state !== null, 'Возвращаемый объект состояния не должен быть null');

  console.log('  ✅ Менеджер синхронизации SyncManager успешно прошел все авто-тесты!');
}
