import { Container, Rectangle } from 'pixi.js';
import { ACTION_BTN_H, ACTION_BTN_W, actionButtonX } from './actionRowLayout.js';

/**
 * Ряд Купить / Заполнить / Соединить.
 * Хит — сама кнопка 126×50, не полоса 410. Иначе центр одной кнопки жмёт соседнюю.
 */
export class ActionRow extends Container {
  constructor({ buy, fill, merge } = {}) {
    super();
    this._buy = buy;
    this._fill = fill;
    this._merge = merge;

    this.eventMode = 'passive';
    this.interactiveChildren = true;
    this.sortableChildren = true;
    this.hitArea = null;

    [buy, fill, merge].forEach((btn, i) => {
      if (!btn) return;
      this._armButton(btn, i);
      this.addChild(btn);
    });
  }

  _armButton(btn, index) {
    btn.eventMode = 'static';
    btn.interactiveChildren = false;
    btn.cursor = 'pointer';
    btn.hitArea = new Rectangle(0, 0, ACTION_BTN_W, ACTION_BTN_H);
    btn.x = actionButtonX(index);
    btn.y = 0;
    btn.zIndex = 10 + index;
  }

  /** После смены chrome нельзя ставить eventMode: none — тогда тапы снова поедут на соседа. */
  armButtons() {
    [this._buy, this._fill, this._merge].forEach((btn, i) => {
      if (!btn) return;
      this._armButton(btn, i);
    });
    this.eventMode = 'passive';
    this.interactiveChildren = true;
  }
}

export default ActionRow;
