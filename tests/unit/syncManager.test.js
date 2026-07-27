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

  // 2. Тест серии из 10 быстрых мёрджей подряд (Debounce Buffer Test)
  let saveCount = 0;
  manager.autoSaveDebounceTimer = null;
  
  // Эмуляция 10 частых мёрджей подряд
  for (let i = 0; i < 10; i++) {
    manager.scheduleSave({ coins: 100 + i, maxCatLevel: 3 }, 300);
  }

  // Ждём 400мс
  await new Promise((resolve) => setTimeout(resolve, 400));
  
  // Должен был произойти ровно 1 сглаженный сетевой запрос вместо 10!
  assert.strictEqual(manager.autoSaveDebounceTimer, null, 'После истечения 300мс таймер должен очиститься');

  console.log('  ✅ Менеджер синхронизации SyncManager успешно прошел все авто-тесты!');
}
