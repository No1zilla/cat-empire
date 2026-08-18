import assert from 'node:assert';
import { shouldRevealMidgameChrome, shouldOfferDailyNow, shouldSkipBootMenu, fillRowAlwaysVisible, getTutorialTargets } from '../../src/game/firstSession.js';

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

  const hole = getTutorialTargets().slots;
  assert.ok(hole.y < 140, 'Дыра туториала должна быть на первом ряду котов');
  assert.ok(hole.y + hole.h < 250, 'Карточка подсказки не должна перекрывать котов');
  assert.ok(hole.w > 140, 'Дыра покрывает двух стартовых котиков');

  console.log('  ✅ Первая сессия: меню пропущено, заполнить на месте');
}
