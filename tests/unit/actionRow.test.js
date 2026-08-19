import assert from 'node:assert';
import { CONFIG } from '../../src/config.js';
import {
  ACTION_BTN_W,
  ACTION_BTN_H,
  ACTION_BTN_GAP,
  ACTION_ROW_MARGIN,
  actionButtonX,
  actionRowWidth,
  actionRowFitsGame
} from '../../src/ui/actionRow.js';
import {
  CAT_DECK_H,
  CAT_CARD_H,
  CAT_CARD_Y,
  catDeckLabelsFit
} from '../../src/ui/catDeckLayout.js';

export function runActionRowTests() {
  console.log('🧪 Тестирование ряда Купить / Заполнить / Соединить и Котопедии...');

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

  const gridW = 5 * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING;
  const buttonRowY = 58 + gridW + 12;
  const opsY = buttonRowY + ACTION_BTN_H + 8;
  const liveOpsH = 32;
  const deckBottom = opsY + liveOpsH + 8 + CAT_DECK_H;
  assert.ok(deckBottom <= CONFIG.GAME_HEIGHT, `Котопедия ${deckBottom} не должна вылезать за ${CONFIG.GAME_HEIGHT}`);

  assert.strictEqual(catDeckLabelsFit(), true);
  assert.ok(CAT_CARD_Y + CAT_CARD_H < CAT_DECK_H, 'карточки целиком внутри панели');

  console.log('  ✅ Три кнопки одной ширины, Lvl в Котопедии не обрезается');
}
