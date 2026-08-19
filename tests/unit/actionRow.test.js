import assert from 'node:assert';
import { CONFIG, fitGameHeight, canvasCssSize } from '../../src/config.js';
import {
  ACTION_BTN_W,
  ACTION_BTN_H,
  ACTION_BTN_GAP,
  ACTION_ROW_MARGIN,
  actionButtonX,
  actionRowWidth,
  actionRowFitsGame,
  actionButtonHit,
  actionHitsOverlap,
  actionButtonIndexAt,
  runActionPress
} from '../../src/ui/actionRow.js';
import {
  CAT_DECK_H,
  CAT_CARD_H,
  CAT_CARD_Y,
  CAT_DECK_BOTTOM_PAD,
  CAT_DECK_GAP,
  catDeckLabelsFit,
  catDeckY,
  catDeckFrame
} from '../../src/ui/catDeckLayout.js';

export function runActionRowTests() {
  console.log('🧪 Тестирование ряда Купить / Заполнить / Соединить и Котопедии...');

  const prevH = CONFIG.GAME_HEIGHT;
  try {
    assert.strictEqual(actionButtonX(0), ACTION_ROW_MARGIN);
    assert.strictEqual(actionButtonX(1) - actionButtonX(0), ACTION_BTN_W + ACTION_BTN_GAP);
    assert.strictEqual(actionButtonX(2) - actionButtonX(1), ACTION_BTN_W + ACTION_BTN_GAP);
    assert.strictEqual(
      actionButtonX(2) + ACTION_BTN_W + ACTION_ROW_MARGIN,
      CONFIG.GAME_WIDTH,
      'правый край Соединить совпадает с полем 410'
    );
    assert.strictEqual(actionRowWidth(), CONFIG.GAME_WIDTH);
    assert.strictEqual(actionRowFitsGame(), true);

    const fillHit = actionButtonHit(1);
    const mergeHit = actionButtonHit(2);
    assert.strictEqual(actionHitsOverlap(fillHit, mergeHit), false, 'Заполнить не перекрывает Соединить');
    assert.strictEqual(fillHit.x + fillHit.w + ACTION_BTN_GAP, mergeHit.x);

    assert.strictEqual(actionButtonIndexAt(actionButtonX(0) + 10), 0);
    assert.strictEqual(actionButtonIndexAt(actionButtonX(1) + 10), 1);
    assert.strictEqual(actionButtonIndexAt(actionButtonX(2) + 10), 2, 'тап по Соединить — индекс 2');
    assert.strictEqual(actionButtonIndexAt(actionButtonX(2)), 2);
    assert.notStrictEqual(actionButtonIndexAt(actionButtonX(2) + ACTION_BTN_W / 2), 1, 'центр Соединить не Заполнить');
    assert.strictEqual(actionButtonIndexAt(fillHit.x + fillHit.w + 1), -1, 'щель между кнопками пустая');

    let fillCalls = 0;
    let mergeCalls = 0;
    runActionPress(actionButtonIndexAt(actionButtonX(2) + 20), {
      fill: () => { fillCalls += 1; },
      merge: () => { mergeCalls += 1; }
    });
    assert.strictEqual(fillCalls, 0, 'Соединить не запускает Заполнить');
    assert.strictEqual(mergeCalls, 1, 'Соединить запускает только слияние');

    const wide = canvasCssSize(500, 700, 410, 700);
    assert.strictEqual(wide.width, 410, 'широкий iframe не растягивает канвас по ширине');
    assert.strictEqual(wide.height, 700);
    assert.ok(wide.width / wide.height === 410 / 700 || Math.abs(wide.width / 410 - wide.height / 700) < 0.001);

    const gridW = 5 * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING;
    const buttonRowY = 58 + gridW + 12;

    assert.strictEqual(fitGameHeight(410, 700), 700);
    assert.strictEqual(fitGameHeight(390, 800), Math.round(410 * 800 / 390));
    assert.strictEqual(fitGameHeight(500, 700), 700, 'широкое окно не сжимает поле ниже 700');
    fitGameHeight(410, 700);

    const packed = catDeckFrame({
      buttonRowY,
      actionBtnH: ACTION_BTN_H,
      liveOpsH: 0,
      gameHeight: 700,
      minDeckH: CAT_DECK_H
    });
    assert.strictEqual(packed.y - (buttonRowY + ACTION_BTN_H), CAT_DECK_GAP, 'между кнопками и Котопедией только 8px');
    assert.strictEqual(packed.y + packed.h + CAT_DECK_BOTTOM_PAD, 700, 'панель доходит до низа 700');
    assert.ok(packed.h >= CAT_DECK_H);

    const tall = catDeckFrame({
      buttonRowY,
      actionBtnH: ACTION_BTN_H,
      liveOpsH: 0,
      gameHeight: 840,
      minDeckH: CAT_DECK_H
    });
    assert.strictEqual(tall.y, packed.y, 'на высоком iframe Котопедия не уезжает вниз');
    assert.ok(tall.h > packed.h, 'лишняя высота уходит в панель, а не в дыру');
    assert.strictEqual(tall.y + tall.h + CAT_DECK_BOTTOM_PAD, 840);

    assert.strictEqual(catDeckY({
      buttonRowY,
      actionBtnH: ACTION_BTN_H,
      liveOpsH: 0,
      gameHeight: 700
    }), packed.y);

    const withOps = catDeckFrame({
      buttonRowY,
      actionBtnH: ACTION_BTN_H,
      liveOpsH: 32,
      gameHeight: 700,
      minDeckH: CAT_DECK_H
    });
    assert.strictEqual(withOps.y, buttonRowY + ACTION_BTN_H + CAT_DECK_GAP + 32 + CAT_DECK_GAP);

    assert.strictEqual(catDeckLabelsFit(), true);
    assert.ok(CAT_CARD_Y + CAT_CARD_H < CAT_DECK_H, 'карточки целиком внутри панели');
  } finally {
    CONFIG.GAME_HEIGHT = prevH;
  }

  console.log('  ✅ Три кнопки одной ширины, Котопедия сразу под ними');
}
