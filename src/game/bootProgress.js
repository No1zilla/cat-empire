/**
 * Загрузка прогресса на старте игры — вынесено из Game.init (TASK-108).
 *
 * Здесь нет ни Pixi, ни VK Bridge, ни сети: только решения о том, что считать
 * прогрессом игрока и можно ли ему доверять. Именно в этих двадцати строках жили
 * оба сегодняшних бага с потерей прогресса (TASK-105, TASK-106), а покрыть их
 * тестами внутри 370-строчного init было невозможно.
 */

/** Сколько ждём загрузку, прежде чем показать игроку хоть что-то. */
export const BOOT_LOAD_TIMEOUT_MS = 7000;

/**
 * Стартовое поле новой империи (TASK-117).
 *
 * Было два кота на пустой сетке: одно доступное действие, и после него снова
 * пусто. По воронке 40% игроков уходили, не сделав ни одной покупки — им просто
 * нечего было делать.
 *
 * Теперь на поле четыре пары: четыре слияния доступны сразу, а их результаты
 * дают ещё три. Семь шагов каскадом, каждый со скачком дохода — первая минута
 * наполняется тем, ради чего игру и открывают.
 *
 * ВСЕ коты первого уровня — это не украшательство. `isStarterSnapshot()` считает
 * снимок стартовым по `maxCatLevel <= 1`, и на этом держится защита от затирания
 * облака заглушкой (TASK-106). Положи сюда кота второго уровня — и защита
 * перестанет узнавать стартовое состояние.
 */
export function starterGrid() {
  return [
    { slotIndex: 0, catLevel: 1 },
    { slotIndex: 1, catLevel: 1 },
    { slotIndex: 3, catLevel: 1 },
    { slotIndex: 4, catLevel: 1 },
    { slotIndex: 10, catLevel: 1 },
    { slotIndex: 11, catLevel: 1 },
    { slotIndex: 13, catLevel: 1 },
    { slotIndex: 14, catLevel: 1 }
  ];
}

/** Состояние новой империи. Отдаём копию: у гридов есть кому мутировать. */
export function starterProgress() {
  return {
    coins: 100,
    gems: 10,
    maxCatLevel: 1,
    totalCatsBought: 0,
    totalMerges: 0,
    gridState: starterGrid()
  };
}

/**
 * Стартовый снимок — ровно то, с чего начинает новый игрок.
 * Живёт здесь, а не в StorageService, чтобы модуль оставался чистым и тестируемым
 * без DOM: StorageService тянет за собой vk-bridge, которому нужен `location`.
 */
export function isStarterSnapshot(state = {}) {
  return (Number(state.maxCatLevel) || 1) <= 1
    && (Number(state.totalMerges) || 0) <= 0
    && (Number(state.totalCatsBought) || 0) <= 2;
}

/**
 * Загрузить прогресс, но не ждать дольше таймаута — иначе игрок смотрит в сплэш.
 *
 * Возвращает не только состояние, но и `timedOut`. Это принципиально: при таймауте
 * мы подставляем стартовую заглушку, и она НЕ является прогрессом игрока. Раньше
 * init этого не различал, и заглушка уезжала в облако поверх настоящей империи.
 * Никогда не бросает — падение загрузки равносильно таймауту.
 */
export async function loadBootProgress(loadProgress, timeoutMs = BOOT_LOAD_TIMEOUT_MS) {
  let timer = null;
  const TIMED_OUT = Symbol('timeout');

  const attempt = Promise.resolve()
    .then(() => (typeof loadProgress === 'function' ? loadProgress() : null))
    .catch(() => null);

  const result = await Promise.race([
    attempt,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
    })
  ]);
  if (timer) clearTimeout(timer);

  if (result === TIMED_OUT || !result) {
    return { progress: starterProgress(), timedOut: result === TIMED_OUT, loaded: false };
  }
  return { progress: result, timedOut: false, loaded: true };
}

/**
 * Делать ли разовое сохранение сразу после загрузки.
 *
 * Стартовый снимок не сохраняем: он либо у настоящего новичка (сохранится при
 * первом же действии), либо подставлен по таймауту — и тогда запись затёрла бы
 * облако. Явный сброс прогресса сохраняем всегда: это осознанное решение игрока.
 */
export function shouldSaveOnBoot(progress) {
  return Boolean(progress && progress.isReset) || !isStarterSnapshot(progress);
}
