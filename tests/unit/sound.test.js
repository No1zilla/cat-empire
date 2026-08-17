import assert from 'node:assert';
import { soundManager, BGM_LOOP, getBgmStepSeconds } from '../../src/audio/SoundManager.js';
import { eventBus } from '../../src/utils/EventBus.js';

export function runSoundTests() {
  console.log('🧪 Тестирование Звукового Менеджера (src/audio/SoundManager.js)...');

  assert.strictEqual(soundManager.enabled, true, 'Звуковой менеджер должен быть включен по умолчанию');

  let played = false;
  soundManager.playTone = () => { played = true; };

  eventBus.emit('CATS_MERGED', { level: 2 });
  assert.strictEqual(played, true, 'Реакция на реактивное событие CATS_MERGED должна запускать синтезатор звука');

  assert.ok(BGM_LOOP.bpm >= 110, 'BGM должен быть живее похоронного шага');
  assert.ok(getBgmStepSeconds() < 0.32, 'Восьмые не должны тянуться как синусоида 520мс');
  assert.strictEqual(BGM_LOOP.melody.length, 32);
  assert.strictEqual(BGM_LOOP.bass.length, 32);

  const melodyNotes = BGM_LOOP.melody.filter((hz) => hz > 0);
  assert.ok(melodyNotes.every((hz) => hz >= 392), 'Мелодия в верхнем регистре, не гудит G3');
  assert.ok(Math.max(...melodyNotes) >= 1046, 'Петля дотягивает до светлого C6');
  assert.ok(BGM_LOOP.bass.some((hz) => hz > 0), 'Нужен бас, не одна синусоида');
  assert.ok(BGM_LOOP.melody[BGM_LOOP.melody.length - 1] >= 523, 'Фраза садится в до, не ползёт вниз');

  console.log('  ✅ Звуковой менеджер SoundManager успешно прошел все авто-тесты!');
}
