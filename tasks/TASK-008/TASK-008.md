# 📌 TASK-008: Animated Cat Sprites — замена карточек на живых котиков

> **Статус:** 🟡 В работе
> **Приоритет:** Высокий
> **Зависимости:** TASK-003, TASK-004
> **Ожидаемое время:** 60–90 минут

---

## 🎯 Цель

Заменить цветные прямоугольные карточки с эмодзи на настоящие спрайты котиков-персонажей.
Добавить анимации: **idle bobbing** (котик покачивается на месте) и **прыжок при merge**.

---

## 🎨 Готовые спрайты (уже сгенерированы PM)

Три спрайт-листа лежат в директории артефактов. Разработчику нужно:
1. Скопировать их в `cat-empire/public/assets/cats/`
2. Нарезать каждый лист на 5 отдельных изображений (по одному на уровень)

| Файл | Котики |
|------|--------|
| `cats_levels_1_5.jpg` | Уровни 1–5: котёнок, рыжий, студент, бизнес, корона |
| `cats_levels_6_10.jpg` | Уровни 6–10: магнат, звезда, гений, рыцарь, маг |
| `cats_levels_11_15.jpg` | Уровни 11–15: дракон, космос, феникс, кристалл, бог |

Исходники спрайтов лежат тут:
- `/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/cats_levels_1_5_v3_1784933148864.jpg`
- `/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/cats_levels_6_10_1784931187816.jpg`
- `/Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/cats_levels_11_15_1784931206406.jpg`

Скопировать в проект:
```bash
mkdir -p cat-empire/public/assets/cats
cp /Users/ai/.gemini/antigravity/brain/dcfc0386-a2f9-439b-aa8f-37180c774c67/cats_levels_*_*.jpg cat-empire/public/assets/cats/
```

---

## 📋 Промпт для AI-кодера

```
Замени визуал котиков в «Империи Котиков» с Graphics-карточек на спрайты.
Добавь idle-анимацию (покачивание) и jump-анимацию при merge/спавне.

Проект: Vite + PixiJS v8. Файл Cat.js использует PIXI.Graphics + PIXI.Text.

---

## 1. Подготовка ассетов

В папке `public/assets/cats/` лежат 3 спрайт-листа (JPG):
- `cats_levels_1_5.jpg`   — 5 котиков в ряд, уровни 1–5
- `cats_levels_6_10.jpg`  — 5 котиков в ряд, уровни 6–10
- `cats_levels_11_15.jpg` — 5 котиков в ряд, уровни 11–15

Каждый лист 1280×853px. Один котик занимает ровно 1/5 ширины = 256px.
Высота котика = 853px (полная высота листа).

Нарезка по уровням:
- level 1: лист 1-5, x=0,   width=256
- level 2: лист 1-5, x=256, width=256
- level 3: лист 1-5, x=512, width=256
- level 4: лист 1-5, x=768, width=256
- level 5: лист 1-5, x=1024,width=256
- level 6: лист 6-10, x=0, ...аналогично
- ...и так далее

---

## 2. src/utils/catTextures.js (НОВЫЙ ФАЙЛ)

```js
import { Assets, Texture, Rectangle } from 'pixi.js';

const SHEET_WIDTH = 1280;
const SHEET_HEIGHT = 853;
const CAT_WIDTH = SHEET_WIDTH / 5;   // 256
const CAT_HEIGHT = SHEET_HEIGHT;      // 853

// Загрузка и нарезка спрайт-листов
let textures = null;

export async function loadCatTextures() {
  const [sheet1, sheet2, sheet3] = await Promise.all([
    Assets.load('/assets/cats/cats_levels_1_5.jpg'),
    Assets.load('/assets/cats/cats_levels_6_10.jpg'),
    Assets.load('/assets/cats/cats_levels_11_15.jpg'),
  ]);

  const sheets = [sheet1, sheet2, sheet3];
  textures = {};

  for (let level = 1; level <= 15; level++) {
    const sheetIndex = Math.floor((level - 1) / 5); // 0, 1, 2
    const posInSheet = (level - 1) % 5;             // 0..4
    const sheet = sheets[sheetIndex];

    textures[level] = new Texture({
      source: sheet.source,
      frame: new Rectangle(
        posInSheet * CAT_WIDTH,
        0,
        CAT_WIDTH,
        CAT_HEIGHT
      )
    });
  }

  return textures;
}

export function getCatTexture(level) {
  if (!textures || !textures[level]) {
    throw new Error(`Текстура для уровня ${level} не загружена`);
  }
  return textures[level];
}
```

---

## 3. Обновление src/game/Cat.js

Замени содержимое файла:

```js
import { Container, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { getCatTexture } from '../utils/catTextures.js';

export class Cat extends Container {
  constructor(level, slotIndex) {
    super();
    this.level = level;
    this.slotIndex = slotIndex;
    this._ticker = null;  // для idle-анимации
    this._draw();
    this._startIdleAnimation();
  }

  _draw() {
    this.removeChildren();

    const texture = getCatTexture(this.level);
    const sprite = new Sprite(texture);

    // Вписываем котика в ячейку (CELL_SIZE - 10) x (CELL_SIZE - 10)
    const targetSize = CONFIG.CELL_SIZE - 10;
    const scale = targetSize / Math.max(sprite.texture.width, sprite.texture.height);
    sprite.scale.set(scale);

    // Центрируем по горизонтали, прижимаем к низу ячейки
    sprite.x = (targetSize - sprite.width) / 2;
    sprite.y = targetSize - sprite.height;

    this.addChild(sprite);
    this._sprite = sprite;
  }

  // Idle анимация: котик плавно покачивается вверх-вниз
  _startIdleAnimation() {
    const amplitude = 3;   // пикселей вверх-вниз
    const speed = 0.002;   // скорость
    const startTime = Date.now() + Math.random() * 1000; // рандомная фаза

    const tick = () => {
      if (!this._sprite || this.destroyed) return;
      const elapsed = Date.now() - startTime;
      this._sprite.y = (CONFIG.CELL_SIZE - 10 - this._sprite.height) + Math.sin(elapsed * speed) * amplitude;
      this._ticker = requestAnimationFrame(tick);
    };

    this._ticker = requestAnimationFrame(tick);
  }

  _stopIdleAnimation() {
    if (this._ticker) {
      cancelAnimationFrame(this._ticker);
      this._ticker = null;
    }
  }

  // Анимация прыжка (вызывается при спавне и merge)
  playJumpAnimation() {
    this._stopIdleAnimation();
    const startTime = Date.now();
    const duration = 400;
    const jumpHeight = 25;
    const baseY = CONFIG.CELL_SIZE - 10 - (this._sprite?.height || 50);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        // Параболический прыжок: sin(π * t) дает дугу вверх и обратно
        const progress = elapsed / duration;
        const offsetY = -Math.sin(Math.PI * progress) * jumpHeight;
        if (this._sprite) this._sprite.y = baseY + offsetY;
        requestAnimationFrame(animate);
      } else {
        if (this._sprite) this._sprite.y = baseY;
        this._startIdleAnimation(); // вернуть idle после прыжка
      }
    };

    requestAnimationFrame(animate);
  }

  setLevel(newLevel) {
    this._stopIdleAnimation();
    this.level = newLevel;
    this._draw();
    this._startIdleAnimation();
  }

  destroy(options) {
    this._stopIdleAnimation();
    super.destroy(options);
  }
}

export default Cat;
```

---

## 4. Загрузка текстур в main.js

В `src/main.js` перед запуском игры добавь загрузку текстур:

```js
import { loadCatTextures } from './utils/catTextures.js';

// ...существующий код...

// После инициализации PixiJS app, перед game.init():
await loadCatTextures();
await game.init(userName);
```

---

## 5. Добавить вызов playJumpAnimation

В `SpawnSystem.js` после `this.grid.addCat(cat, freeSlot)`:
```js
cat.playJumpAnimation();
```

В `MergeEngine.js` после `this.grid.addCat(newCat, slotIndexB)`:
```js
newCat.playJumpAnimation();
```
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Вместо цветных карточек на поле видны персонажи-котики |
| 2 | Каждый уровень отображает своего уникального котика |
| 3 | Котики плавно покачиваются в idle (разная фаза у каждого) |
| 4 | При спавне котик делает прыжок |
| 5 | При merge новый котик делает прыжок |
| 6 | Drag-and-drop всё ещё работает корректно |
| 7 | В консоли нет ошибок |

---

## 📎 Что принести на ревью

1. Скриншот игрового поля с котиками-спрайтами.
2. Скриншот merge — котик нового уровня после объединения.

---

> [!IMPORTANT]
> Не переходи к следующей задаче, пока PM не примет!
