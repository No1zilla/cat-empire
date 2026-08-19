import { Container, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';
import {
  ACTION_BTN_H,
  actionButtonX,
  actionButtonIndexAt,
  runActionPress
} from './actionRow.js';

/**
 * Один хитбокс на ряд. Дети (Купить / Заполнить / Соединить) только рисуются.
 * Тап по правой кнопке не может вызвать Заполнить.
 */
export class ActionRow extends Container {
  constructor({ buy, fill, merge } = {}) {
    super();
    this._buy = buy;
    this._fill = fill;
    this._merge = merge;
    this._downIndex = -1;

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.interactiveChildren = false;
    this.hitArea = new Rectangle(0, 0, CONFIG.GAME_WIDTH || 410, ACTION_BTN_H);

    [buy, fill, merge].forEach((btn, i) => {
      if (!btn) return;
      btn.eventMode = 'none';
      btn.x = actionButtonX(i);
      btn.y = 0;
      this.addChild(btn);
    });

    this.on('pointerdown', (e) => this._onDown(e));
    this.on('pointerup', () => this._onUp());
    this.on('pointerupoutside', () => this._onUp());
    this.on('pointercancel', () => this._onUp());
  }

  _localX(e) {
    if (!e) return NaN;
    if (typeof this.toLocal === 'function' && e.global) {
      return this.toLocal(e.global).x;
    }
    return e.global && Number.isFinite(e.global.x) ? e.global.x : NaN;
  }

  _onDown(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const index = actionButtonIndexAt(this._localX(e));
    this._downIndex = index;
    runActionPress(index, {
      buy: () => this._buy && typeof this._buy.pressDown === 'function' && this._buy.pressDown(),
      fill: () => this._fill && typeof this._fill.press === 'function' && this._fill.press(),
      merge: () => this._merge && typeof this._merge.press === 'function' && this._merge.press()
    });
  }

  _onUp() {
    if (this._buy && typeof this._buy.pressUp === 'function') this._buy.pressUp();
    this._downIndex = -1;
  }
}

export default ActionRow;
