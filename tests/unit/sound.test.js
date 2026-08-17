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

  assert.ok(BGM_LOOP.bpm >= 96 && BGM_LOOP.bpm <= 108, 'Живая, но не дёрганая петля');
  assert.ok(getBgmStepSeconds() < 0.35, 'Восьмые не тянутся как похоронная синусоида');
  assert.strictEqual(BGM_LOOP.melody.length, 32);
  assert.strictEqual(BGM_LOOP.bass.length, 32);
  assert.strictEqual(BGM_LOOP.hats, false, 'Без резких хэтов');
  assert.ok(BGM_LOOP.melodyGain <= 0.025, 'Мелодия тише, чем щипок 0.04');
  assert.ok(BGM_LOOP.cutoffHz <= 1100, 'Верх срезан, без писка');

  const melodyNotes = BGM_LOOP.melody.filter((hz) => hz > 0);
  assert.ok(melodyNotes.every((hz) => hz >= 392), 'Мелодия не гудит в G3');
  assert.ok(Math.max(...melodyNotes) <= 880, 'Без визжащего C6');
  assert.ok(BGM_LOOP.bass.some((hz) => hz > 0), 'Нужен бас');
  assert.ok(BGM_LOOP.melody[BGM_LOOP.melody.length - 1] >= 523, 'Фраза садится в до');

  console.log('  ✅ Звуковой менеджер SoundManager успешно прошел все авто-тесты!');
}
