import { Container, Graphics, Sprite } from 'pixi.js';
import { CONFIG, ROOM_HEIGHT } from '../config.js';
import { getCatTexture, whenCatTexturesChange } from '../utils/catTextures.js';
import { pawPrints, shade } from '../utils/PaintedUI.js';

/**
 * Комната над полем (TASK-123).
 *
 * Раньше экран был сеткой во весь рост: игра читалась как головоломка, а коты —
 * как фишки. У лидера жанра иначе — поле маленькое внизу, а сверху комната, по
 * которой бродят те же коты. Именно это превращает «мержилку» в «место, где у
 * меня живут питомцы», и именно этого у нас не было.
 *
 * Всё рисуется примитивами: доски пола со стыками и волокном, кирпичная стена,
 * плинтус. Растровые здесь только сами коты — те, что уже есть в игре.
 */

/** Высота стены в пикселях: остальное — пол, на котором стоит лоток поля. */
const WALL_HEIGHT = 96;

/** Сколько котов бродит. Больше — каша, меньше — комната кажется пустой. */
const WANDERER_COUNT = 5;

export class Room extends Container {
  /**
   * @param {number} width ширина сцены
   * @param {number} height ПОЛНАЯ высота экрана: комната идёт от края до края,
   *   иначе получается разрыв — сверху интерьер, снизу улица.
   * @param {{walkTop:number, walkBottom:number}} walkBand полоса пола, по которой
   *   разрешено гулять котам: между стеной и лотком поля.
   */
  constructor(width = CONFIG.GAME_WIDTH, height = ROOM_HEIGHT, walkBand = {}) {
    super();
    this.roomWidth = width;
    this.roomHeight = height;
    this.walkTop = walkBand.walkTop !== undefined ? walkBand.walkTop : WALL_HEIGHT + 16;
    this.walkBottom = walkBand.walkBottom !== undefined ? walkBand.walkBottom : height - 8;
    this._wanderers = [];
    this._maxLevel = 1;

    this._drawWall();
    this._drawFloor();

    this._catLayer = new Container();
    this.addChild(this._catLayer);
    this._spawnWanderers();

    // Текстуры котов грузятся асинхронно: если комната собралась раньше, чем
    // они доехали, коты появятся по этому событию.
    this._unsubscribe = whenCatTexturesChange(() => this._refreshWandererTextures());
  }

  _drawWall() {
    const wallH = WALL_HEIGHT;
    const base = 0xe8c4c0;

    const wall = new Graphics();
    wall.rect(0, 0, this.roomWidth, wallH).fill({ color: base });

    // Кирпичи со смещением рядов: шов светлее кирпича, а не темнее — так стена
    // выглядит оштукатуренной, а не сырой кладкой.
    const brickH = 16;
    const brickW = 46;
    for (let row = 0, y = 0; y < wallH; row += 1, y += brickH) {
      const offset = row % 2 ? -brickW / 2 : 0;
      wall.moveTo(0, y).lineTo(this.roomWidth, y).stroke({ color: shade(base, 0.35), width: 2 });
      for (let x = offset; x < this.roomWidth; x += brickW) {
        wall.moveTo(x, y).lineTo(x, Math.min(y + brickH, wallH))
          .stroke({ color: shade(base, 0.28), width: 1.5 });
      }
    }
    this.addChild(wall);

    // Плинтус — граница стены и пола, без него комната «плывёт».
    const skirting = new Graphics();
    skirting.rect(0, wallH - 7, this.roomWidth, 7).fill({ color: 0xb8825a });
    skirting.rect(0, wallH - 7, this.roomWidth, 2).fill({ color: 0xd9a97c });
    this.addChild(skirting);
  }

  _drawFloor() {
    const wallH = WALL_HEIGHT;
    const floorH = this.roomHeight - wallH;
    const base = 0xc98f4e;

    const floor = new Graphics();
    floor.rect(0, wallH, this.roomWidth, floorH).fill({ color: base });

    // Доски: горизонтальные ряды со смещёнными стыками.
    const plankH = 26;
    for (let row = 0, y = wallH; y < this.roomHeight; row += 1, y += plankH) {
      floor.moveTo(0, y).lineTo(this.roomWidth, y).stroke({ color: shade(base, -0.28), width: 2 });
      // Волокно вдоль доски.
      floor.moveTo(10, y + plankH * 0.45)
        .bezierCurveTo(this.roomWidth * 0.35, y + plankH * 0.3, this.roomWidth * 0.7, y + plankH * 0.6, this.roomWidth - 10, y + plankH * 0.45)
        .stroke({ color: shade(base, -0.18), width: 1, alpha: 0.5 });
      // Поперечный стык, смещённый через ряд.
      const seam = row % 2 ? this.roomWidth * 0.33 : this.roomWidth * 0.68;
      floor.moveTo(seam, y).lineTo(seam, Math.min(y + plankH, this.roomHeight))
        .stroke({ color: shade(base, -0.3), width: 1.5 });
    }
    this.addChild(floor);

    const paws = pawPrints(this.roomWidth, floorH, { color: shade(base, -0.2), alpha: 0.22, count: 7 });
    paws.y = wallH;
    this.addChild(paws);
  }

  _spawnWanderers() {
    for (let i = 0; i < WANDERER_COUNT; i += 1) {
      const cat = new Sprite();
      cat.anchor.set(0.5, 1);
      cat.width = 46;
      cat.height = 46;
      cat.x = 30 + Math.random() * (this.roomWidth - 60);
      cat.y = this.walkTop + Math.random() * Math.max(1, this.walkBottom - this.walkTop);

      const wanderer = {
        sprite: cat,
        // У каждого свой темп и своя пауза, иначе стая марширует строем.
        speed: 0.16 + Math.random() * 0.22,
        dir: Math.random() > 0.5 ? 1 : -1,
        pauseUntil: 0,
        bobPhase: Math.random() * Math.PI * 2,
        level: 1
      };
      this._wanderers.push(wanderer);
      this._catLayer.addChild(cat);
    }
    this._refreshWandererTextures();
  }

  /**
   * Кто гуляет: коты уровней, до которых игрок уже дошёл. Комната так становится
   * витриной прогресса, а не декорацией.
   */
  setMaxLevel(level) {
    const next = Math.max(1, Number(level) || 1);
    if (next === this._maxLevel) return;
    this._maxLevel = next;
    this._refreshWandererTextures();
  }

  _refreshWandererTextures() {
    this._wanderers.forEach((w, i) => {
      const level = Math.max(1, this._maxLevel - (i % 3));
      const texture = getCatTexture(level);
      if (!texture) return;
      w.level = level;
      w.sprite.texture = texture;
      w.sprite.width = 46;
      w.sprite.height = 46;
    });
  }

  /** Шаг анимации. Вызывается тикером игры. */
  update(now = Date.now()) {
    this._wanderers.forEach((w) => {
      if (now < w.pauseUntil) {
        // Пауза: кот стоит и чуть покачивается, будто дышит.
        w.sprite.y += Math.sin((now + w.bobPhase * 1000) / 420) * 0.06;
        return;
      }

      w.sprite.x += w.speed * w.dir;

      // Дошёл до края — разворот и короткая остановка.
      if (w.sprite.x < 24 || w.sprite.x > this.roomWidth - 24) {
        w.dir *= -1;
        w.pauseUntil = now + 600 + Math.random() * 1800;
      } else if (Math.random() < 0.0015) {
        w.pauseUntil = now + 800 + Math.random() * 2200;
        if (Math.random() < 0.4) w.dir *= -1;
      }

      // Зеркалим спрайт по направлению движения.
      w.sprite.scale.x = Math.abs(w.sprite.scale.x) * (w.dir > 0 ? 1 : -1);

      // Чем ниже кот, тем он ближе: сортировка по глубине.
      w.sprite.zIndex = Math.round(w.sprite.y);
    });

    this._catLayer.sortableChildren = true;
    // Держим котов на полу, если кто-то уплыл вверх от покачивания.
    this._wanderers.forEach((w) => {
      const minY = this.walkTop;
      const maxY = this.walkBottom;
      if (w.sprite.y < minY) w.sprite.y = minY;
      if (w.sprite.y > maxY) w.sprite.y = maxY;
    });
  }

  destroy(options) {
    if (typeof this._unsubscribe === 'function') this._unsubscribe();
    super.destroy(options);
  }
}

export default Room;
