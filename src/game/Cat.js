import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatData } from '../utils/catVisuals.js';

// Класс котика для отображения на игровом поле
export class Cat extends Container {
  constructor(level = 1, slotIndex = 0) {
    super();
    this.level = level;
    this.slotIndex = slotIndex;
    this._draw();
  }

  _draw() {
    this.removeChildren();

    const cardWidth = CONFIG.CELL_SIZE - 10;
    const cardHeight = CONFIG.CELL_SIZE - 10;
    const catData = getCatData(this.level);

    // 1. Создать фон-карточку котика
    const bg = new Graphics();
    bg.roundRect(0, 0, cardWidth, cardHeight, 12);
    bg.fill(catData.color);
    this.addChild(bg);

    // 2. Создать текст с эмодзи котика
    const emojiStyle = new TextStyle({
      fontSize: 30,
      align: 'center'
    });
    const emojiText = new Text({
      text: catData.emoji,
      style: emojiStyle
    });
    emojiText.anchor.set(0.5, 0.5);
    emojiText.x = cardWidth / 2;
    emojiText.y = cardHeight / 2 - 4;
    this.addChild(emojiText);

    // 3. Создать текст с уровнем котика ("Lvl N")
    const levelStyle = new TextStyle({
      fontSize: 11,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center'
    });
    const levelText = new Text({
      text: `Lvl ${this.level}`,
      style: levelStyle
    });
    levelText.anchor.set(0.5, 1);
    levelText.x = cardWidth / 2;
    levelText.y = cardHeight - 4;
    this.addChild(levelText);
  }

  // Обновление уровня котика
  setLevel(newLevel) {
    this.level = newLevel;
    this._draw();
  }
}

export default Cat;
