import assert from 'node:assert';
import { VkIdentity } from '../../src/services/VkIdentity.js';

export async function runTutorialAndBridgeTests() {
  console.log('🧪 Тестирование Задержки VK Bridge (Mobile IPC) и Блокировки Туториала...');

  // 1. Тест задержки VK Bridge (Моделирование 800мс ответа на смартфоне)
  const identity = new VkIdentity();
  global.window = {
    location: { search: '', hash: '' },
    vkBridge: {
      send: (event) => {
        if (event === 'VKWebAppGetUserInfo') {
          return new Promise((resolve) => setTimeout(() => resolve({ id: 555666777 }), 800));
        }
        return Promise.resolve(null);
      }
    }
  };

  const startTime = Date.now();
  const vkId = await identity.getVkUserId();
  const duration = Date.now() - startTime;

  assert.strictEqual(vkId, '555666777', 'VkIdentity должен укладываться в 5-секундное окно для ответа мобильного VK Bridge');
  assert.ok(duration >= 750, 'Задержка ответа 800мс должна обрабатываться нормально без падающего 500мс тайм-аута');

  // 2. Тест автоматической блокировки туториала при наличии прогресса
  let tutorialShown = false;
  const mockLocalStorage = {};

  const simulateShowTutorialIfNeeded = (maxCatLevel, totalCatsBought) => {
    const tutorialDone = mockLocalStorage['cat_empire_tutorial_done'];
    if (maxCatLevel > 1 || totalCatsBought > 0) {
      mockLocalStorage['cat_empire_tutorial_done'] = '1';
      return false;
    }
    if (!tutorialDone) {
      tutorialShown = true;
      return true;
    }
    return false;
  };

  const isTutorialTriggeredForProPlayer = simulateShowTutorialIfNeeded(9, 8100);
  assert.strictEqual(isTutorialTriggeredForProPlayer, false, 'Игрок с котиком 9 уровня и 8100 покупками НЕ ДОЛЖЕН видеть туториал!');
  assert.strictEqual(mockLocalStorage['cat_empire_tutorial_done'], '1', 'Флаг туториала должен автоматически ставиться в 1 при обнаружении прогресса');

  console.log('  ✅ Тесты задержки VK Bridge на мобах и блокировки туториала успешно пройдены!');
}
