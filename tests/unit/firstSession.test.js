import assert from 'node:assert';
import { shouldRevealMidgameChrome, shouldOfferDailyNow, shouldSkipBootMenu, fillRowAlwaysVisible, getTutorialTargets } from '../../src/game/firstSession.js';
import { CONFIG, ROOM_HEIGHT } from '../../src/config.js';

export function runFirstSessionTests() {
  console.log('🧪 Тестирование первой сессии: поле и кнопки сразу...');

  assert.strictEqual(shouldSkipBootMenu(), true, 'Стартовое меню не должно перехватывать первый заход');
  assert.strictEqual(fillRowAlwaysVisible(), true, 'Заполнить и Соединить видны с первого кадра');

  assert.strictEqual(shouldRevealMidgameChrome({ maxCatLevel: 1, totalMerges: 0 }), false);
  assert.strictEqual(shouldRevealMidgameChrome({ maxCatLevel: 2, totalMerges: 0 }), true);
  assert.strictEqual(shouldRevealMidgameChrome({ maxCatLevel: 1, totalMerges: 1 }), true);

  assert.strictEqual(shouldOfferDailyNow({
    chromeRevealed: false,
    canClaim: true,
    alreadyOffered: false
  }), false, 'Календарь не показываем до первого слияния');

  assert.strictEqual(shouldOfferDailyNow({
    chromeRevealed: true,
    canClaim: true,
    alreadyOffered: false
  }), true);

  assert.strictEqual(shouldOfferDailyNow({
    chromeRevealed: true,
    canClaim: true,
    alreadyOffered: true
  }), false);

  // TASK-123: поле уехало вниз под комнату, поэтому проверяем не абсолютные
  // пиксели, а смысл: дыра туториала лежит ровно на первом ряду слотов и
  // высотой в одну ячейку. Так тест переживёт следующий переезд раскладки.
  const hole = getTutorialTargets().slots;
  assert.strictEqual(
    hole.y,
    ROOM_HEIGHT + CONFIG.GRID_PADDING,
    'Дыра туториала начинается на первом ряду слотов'
  );
  assert.strictEqual(hole.h, CONFIG.CELL_SIZE, 'Высота дыры — одна ячейка');
  assert.ok(
    hole.w > CONFIG.CELL_SIZE && hole.w <= CONFIG.CELL_SIZE * 2 + CONFIG.GRID_PADDING,
    'Подсвечиваем пару соседних котов, а не всё поле'
  );
  assert.ok(hole.w > 140, 'Дыра покрывает двух стартовых котиков');

  console.log('  ✅ Первая сессия: меню пропущено, заполнить на месте');
}
