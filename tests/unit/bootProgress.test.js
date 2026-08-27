import assert from 'node:assert';
import {
  loadBootProgress,
  shouldSaveOnBoot,
  isStarterSnapshot,
  starterProgress,
  BOOT_LOAD_TIMEOUT_MS
} from '../../src/game/bootProgress.js';

/**
 * Загрузка прогресса на старте (TASK-108).
 * Файл Game.js держит худшее здоровье в репозитории (1.0/10) и за полгода собрал
 * 56 багфиксов; два из них — сегодняшние потери прогресса. Логика вынесена сюда
 * именно чтобы закрепить их тестами.
 */
export async function runBootProgressTests() {
  console.log('🧪 Тестирование загрузки прогресса на старте (bootProgress)...');

  const empire = {
    coins: 5000, gems: 40, maxCatLevel: 6,
    totalCatsBought: 250, totalMerges: 300,
    gridState: [{ slotIndex: 0, catLevel: 6 }]
  };

  // 1. Обычная загрузка отдаёт то, что вернуло хранилище
  const ok = await loadBootProgress(async () => empire);
  assert.deepStrictEqual(ok.progress, empire, 'прогресс возвращается как есть');
  assert.strictEqual(ok.loaded, true, 'загрузка помечена состоявшейся');
  assert.strictEqual(ok.timedOut, false);

  // 2. Медленное хранилище: игрок не должен смотреть в сплэш вечно
  const slow = await loadBootProgress(
    () => new Promise((resolve) => setTimeout(() => resolve(empire), 300)),
    40
  );
  assert.strictEqual(slow.timedOut, true, 'долгая загрузка обрывается таймаутом');
  assert.strictEqual(slow.loaded, false, 'состояние НЕ считается загруженным');
  assert.strictEqual(slow.progress.totalCatsBought, 0, 'подставлен стартовый снимок');

  // TASK-106: заглушка по таймауту — не прогресс игрока. Именно на этом отличии
  // держится запрет писать её в облако; без него империя затиралась нулями.
  assert.strictEqual(
    isStarterSnapshot(slow.progress), true,
    'подставленное состояние распознаётся как стартовое'
  );

  // 3. Падение загрузки равносильно таймауту, наружу не бросается
  const boom = await loadBootProgress(async () => { throw new Error('сеть отвалилась'); });
  assert.strictEqual(boom.loaded, false, 'ошибка не считается загрузкой');
  assert.strictEqual(boom.progress.coins, 100, 'отдан стартовый снимок');

  // 4. Пустой ответ хранилища — тоже не загрузка
  const empty = await loadBootProgress(async () => null);
  assert.strictEqual(empty.loaded, false, 'null не считается прогрессом');

  // 5. Стартовый снимок отдаётся копией: гриды мутируют по ходу игры
  const a = starterProgress();
  const b = starterProgress();
  a.gridState.push({ slotIndex: 5, catLevel: 3 });
  assert.strictEqual(b.gridState.length, 2, 'копии не делят один массив');

  // 6. Разовое сохранение сразу после загрузки
  assert.strictEqual(
    shouldSaveOnBoot(empire), true,
    'настоящую империю сохраняем'
  );
  assert.strictEqual(
    shouldSaveOnBoot(starterProgress()), false,
    'стартовый снимок не сохраняем: он может быть заглушкой по таймауту'
  );
  assert.strictEqual(
    shouldSaveOnBoot({ ...starterProgress(), isReset: true }), true,
    'явный сброс прогресса — осознанное решение игрока, сохраняем'
  );

  // TASK-105: guard не должен запирать сам себя. Новичок, купивший пару котов,
  // остаётся «стартовым» — и раньше это блокировало ему сохранение навсегда.
  // Теперь решение принимает не форма данных, а факт удачной загрузки.
  const rookie = { ...starterProgress(), totalCatsBought: 2 };
  assert.strictEqual(isStarterSnapshot(rookie), true, 'два кота — ещё стартовое состояние');
  const rookieBoot = await loadBootProgress(async () => rookie);
  assert.strictEqual(rookieBoot.loaded, true, 'загрузка новичка состоялась — записи разрешены');

  // 7. Граница стартового снимка
  assert.strictEqual(isStarterSnapshot({ maxCatLevel: 2 }), false, 'второй уровень — уже не старт');
  assert.strictEqual(isStarterSnapshot({ totalMerges: 1 }), false, 'первое слияние — уже не старт');
  assert.strictEqual(isStarterSnapshot({ totalCatsBought: 3 }), false, 'третий кот — уже не старт');

  assert.strictEqual(BOOT_LOAD_TIMEOUT_MS, 7000, 'таймаут загрузки не изменился молча');

  console.log('  ✅ Таймаут не выдаёт заглушку за прогресс, guard не запирает новичка');
}
