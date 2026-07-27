import assert from 'node:assert';
import { soundManager } from '../../src/audio/SoundManager.js';
import { eventBus } from '../../src/utils/EventBus.js';

export function runSoundTests() {
  console.log('🧪 Тестирование Звукового Менеджера (src/audio/SoundManager.js)...');

  assert.strictEqual(soundManager.enabled, true, 'Звуковой менеджер должен быть включен по умолчанию');

  let played = false;
  soundManager.playTone = () => { played = true; };

  eventBus.emit('CATS_MERGED', { level: 2 });
  assert.strictEqual(played, true, 'Реакция на реактивное событие CATS_MERGED должна запускать синтезатор звука');

  console.log('  ✅ Звуковой менеджер SoundManager успешно прошел все авто-тесты!');
}
