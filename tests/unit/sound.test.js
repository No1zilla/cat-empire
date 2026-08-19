import assert from 'node:assert';
import {
  soundManager,
  BGM_LOOP,
  MERGE_SFX,
  FILL_SFX,
  MUSIC_AVAILABLE,
  getBgmStepSeconds
} from '../../src/audio/SoundManager.js';
import { eventBus } from '../../src/utils/EventBus.js';

export function runSoundTests() {
  console.log('🧪 Тестирование Звукового Менеджера (src/audio/SoundManager.js)...');

  assert.strictEqual(soundManager.enabled, true, 'Звуковой менеджер должен быть включен по умолчанию');
  assert.strictEqual(MUSIC_AVAILABLE, false, 'Фоновая музыка отключена в продукте');
  soundManager.setMusicEnabled(true);
  assert.strictEqual(soundManager.musicEnabled, false, 'Музыку нельзя случайно включить обратно');
  soundManager.startBgm();
  assert.strictEqual(soundManager._bgmTimer, null, 'BGM не создаёт таймер');

  let played = false;
  soundManager.playTone = () => { played = true; };

  eventBus.emit('CATS_MERGED', { level: 2 });
  assert.strictEqual(played, true, 'Реакция на реактивное событие CATS_MERGED должна запускать синтезатор звука');

  assert.ok(BGM_LOOP.bpm >= 72 && BGM_LOOP.bpm <= 84, 'Спокойный двор, не марш');
  assert.ok(getBgmStepSeconds() > 0.35 && getBgmStepSeconds() < 0.45, 'Шаг не дёрганый');
  assert.strictEqual(BGM_LOOP.melody.length, 32);
  assert.strictEqual(BGM_LOOP.bass.length, 32);
  assert.strictEqual(BGM_LOOP.hats, false, 'Без резких хэтов');
  assert.ok(BGM_LOOP.melodyGain <= 0.014, 'Мелодия тихая');
  assert.ok(BGM_LOOP.cutoffHz <= 650, 'Верх срезан, без писка');
  assert.ok((BGM_LOOP.melody.filter((hz) => hz === 0).length) >= 12, 'Между нотами есть воздух');

  const melodyNotes = BGM_LOOP.melody.filter((hz) => hz > 0);
  assert.ok(melodyNotes.every((hz) => hz >= 392), 'Мелодия не гудит в G3');
  assert.ok(Math.max(...melodyNotes) <= 659.25, 'Без визжащего G5/A5');
  assert.ok(BGM_LOOP.bass.some((hz) => hz > 0), 'Нужен бас');
  assert.ok(BGM_LOOP.melody[BGM_LOOP.melody.length - 1] >= 523, 'Фраза садится в до');

  assert.strictEqual(MERGE_SFX.notes.length, 3);
  assert.ok(Math.max(...MERGE_SFX.gains) <= 0.012, 'Слияние тихое, не орёт на каждое заполнение');
  assert.ok(MERGE_SFX.cutoff <= 500, 'Слияние без писка сверху');
  assert.ok(MERGE_SFX.attack >= 0.08, 'Атака мягкая, без щелчка');
  assert.ok(Math.max(...MERGE_SFX.notes) <= 392, 'Слияние не выше G4');
  assert.ok(MERGE_SFX.cooldownMs >= 600, 'Каскад слияний не наслаивает перезвон');

  soundManager._lastMergeAt = Date.now();
  let spam = false;
  soundManager.playTone = () => { spam = true; };
  eventBus.emit('CATS_MERGED', { level: 3 });
  assert.strictEqual(spam, false, 'Повтор слияния в cooldown молчит');

  assert.strictEqual(FILL_SFX.notes.length, 2);
  assert.ok(Math.max(...FILL_SFX.gains) <= 0.01, 'Заполнить тише покупки');
  assert.ok(Math.max(...FILL_SFX.notes) <= 392, 'Заполнить без тяжёлого верха');
  assert.ok(FILL_SFX.attack >= 0.07, 'Заполнить без щелчка');

  let fillPlayed = 0;
  let buyPlayed = 0;
  soundManager.playFill = () => { fillPlayed += 1; };
  soundManager.playBuy = () => { buyPlayed += 1; };
  soundManager.playMeow = () => { buyPlayed += 10; };
  eventBus.emit('COINS_SPENT', { coins: 40, fill: true });
  eventBus.emit('CAT_SPAWNED', { count: 8, fill: true });
  assert.strictEqual(fillPlayed, 1, 'Заполнить играет свой звук');
  assert.strictEqual(buyPlayed, 0, 'Заполнить не бьёт buy/meow');
  eventBus.emit('COINS_SPENT', { coins: 10 });
  assert.strictEqual(buyPlayed, 1, 'Обычная покупка по-прежнему buy');

  console.log('  ✅ Звуковой менеджер SoundManager успешно прошел все авто-тесты!');
}
