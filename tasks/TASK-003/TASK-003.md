# 📌 TASK-003: Игровое поле 5×5 и спавн котиков

> **Статус:** 🟢 Выполнено
> **Приоритет:** Высокий
> **Зависимости:** TASK-001, TASK-002
> **Ожидаемое время:** 40–60 минут

---

## 🎯 Цель

Отрисовать сетку 5×5 через PixiJS. Создать класс котика `Cat.js` с визуалом по уровням. Реализовать спавн котиков в свободные слоты по кнопке покупки. Связать состояние сетки с бэкендом из TASK-002.

---

## 📁 Добавляемые файлы

```
cat-empire/src/
├── game/
│   ├── Grid.js          — компонент сетки 5×5 (25 слотов)
│   ├── Cat.js           — класс котика (уровень, визуал, позиция)
│   └── SpawnSystem.js   — кнопка покупки + спавн в свободный слот
└── utils/
    └── catVisuals.js    — данные котиков по уровням (имя, эмодзи, цвет, доход)
```

---

## 📋 Промпт для AI-кодера

```
Реализуй игровое поле 5×5 и механику спавна котиков в PixiJS
для VK мини-приложения «Империя Котиков».

Проект уже существует: Vite + PixiJS v8 + @vkontakte/vk-bridge.
CONFIG импортируется из `../config.js`.
API клиент (fetchProfile, saveProgress) — из `../api/client.js`.

---

## 1. src/utils/catVisuals.js

Экспортируй функцию getCatData(level):
- Возвращает объект с полями: name, emoji, color, income.
- income = Math.pow(3, level - 1).
- Данные для уровней 1–15:

| level | name               | emoji | color    |
|-------|--------------------|-------|----------|
| 1     | Обычный котик      | 🐱    | #4a90e2  |
| 2     | Весёлый котик      | 😺    | #5ba35f  |
| 3     | Котик-студент      | 😸    | #e2a04a  |
| 4     | Котик-работяга     | 😻    | #c0392b  |
| 5     | Котик-бизнесмен    | 🐱‍👤  | #8e44ad  |
| 6     | Котик-магнат       | 👑    | #2980b9  |
| 7     | Звёздный котик     | 🌟    | #d35400  |
| 8     | Котик-гений        | 🧠    | #16a085  |
| 9     | Котик-герой        | ⚔️    | #c0392b  |
| 10    | Котик-волшебник    | 🔮    | #6c3483  |
| 11    | Котик-дракон       | 🐉    | #922b21  |
| 12    | Космический котик  | 🚀    | #1a5276  |
| 13    | Котик-феникс       | 🦅    | #b7950b  |
| 14    | Котик-легенда      | 💎    | #148f77  |
| 15    | Кото-Бог           | 🏆    | #1a1a1a  |

---

## 2. src/game/Cat.js

Класс Cat расширяет PIXI.Container.

constructor(level, slotIndex):
- this.level = level
- this.slotIndex = slotIndex
- Вызывает this._draw() для первичной отрисовки.

_draw():
- Очищает все дочерние элементы (this.removeChildren()).
- Создаёт PIXI.Graphics — скруглённый прямоугольник:
  - Размер: CONFIG.CELL_SIZE - 10 на CONFIG.CELL_SIZE - 10.
  - Скругление: 12px.
  - Цвет заливки: getCatData(this.level).color (из catVisuals.js).
  - Добавляет Graphics в this.
- Создаёт PIXI.Text с эмодзи getCatData(this.level).emoji:
  - fontSize: 30, anchor: (0.5, 0.5).
  - Позиция: центр карточки (CELL_SIZE/2 - 5, CELL_SIZE/2 - 10).
- Создаёт PIXI.Text с подписью "Lvl N":
  - fontSize: 11, fill: '#ffffff', fontWeight: 'bold', anchor: (0.5, 1).
  - Позиция: (CELL_SIZE/2 - 5, CELL_SIZE - 14).
- Все три элемента добавляются в this через addChild.

setLevel(newLevel):
- this.level = newLevel
- Вызывает this._draw()

---

## 3. src/game/Grid.js

Класс Grid расширяет PIXI.Container.

constructor(app):
- this.app = app
- this.slots = new Array(25).fill(null)  // null = пусто, Cat = занято
- this._drawBackground()
- this._drawCells()

_drawBackground():
- Рисует скруглённый прямоугольник-фон под всей сеткой:
  - Ширина: CONFIG.GRID_SIZE * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING
  - Высота: то же самое.
  - Цвет: CONFIG.COLORS.GRID_BG, скругление 16.

_drawCells():
- Создаёт 25 ячеек сетки 5×5.
- Для каждого индекса i (0..24):
  - col = i % 5, row = Math.floor(i / 5).
  - x = CONFIG.GRID_PADDING + col * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING).
  - y = CONFIG.GRID_PADDING + row * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING).
  - Рисует PIXI.Graphics — скруглённый прямоугольник CONFIG.CELL_SIZE × CONFIG.CELL_SIZE,
    цвет CONFIG.COLORS.CELL_BG, скругление 10.
  - Добавляет Graphics в this.

getSlotPosition(slotIndex):
- Возвращает { x, y } — координаты верхнего левого угла слота slotIndex внутри Grid.

getFreeSlotIndex():
- Возвращает первый индекс where slots[i] === null, или -1 если нет свободных.

addCat(cat, slotIndex):
- this.slots[slotIndex] = cat
- const pos = this.getSlotPosition(slotIndex)
- cat.position.set(pos.x, pos.y)
- this.addChild(cat)

removeCat(slotIndex):
- Если this.slots[slotIndex] !== null:
  - this.removeChild(this.slots[slotIndex])
  - this.slots[slotIndex] = null

exportState():
- Возвращает массив { slotIndex, catLevel } для всех занятых слотов.

importState(gridStateArr):
- gridStateArr — массив объектов { slotIndex, catLevel } (уже распарсенный из JSON).
- Для каждого элемента: создаёт Cat, вызывает this.addCat(cat, slotIndex).

---

## 4. src/game/SpawnSystem.js

Класс SpawnSystem расширяет PIXI.Container.

constructor(app, grid, onCoinSpend):
- this.app = app
- this.grid = grid
- this.onCoinSpend = onCoinSpend // коллбэк при покупке котика

_createButton():
- PIXI.Graphics: скруглённый прямоугольник 200×50, цвет CONFIG.COLORS.ACCENT, скругление 12.
- PIXI.Text: «🐱 Купить котика (10 монет)», fontSize 16, fill white, anchor (0.5, 0.5), по центру кнопки.
- Кнопка eventMode = 'static', cursor = 'pointer'.
- On 'pointerdown': вызывает this._spawnCat().
- On 'pointerover': alpha = 0.8. On 'pointerout': alpha = 1.

_spawnCat():
- const freeSlot = this.grid.getFreeSlotIndex()
- Если freeSlot === -1: ничего не делаем (нет места).
- Создаём const cat = new Cat(1, freeSlot).
- this.grid.addCat(cat, freeSlot).
- Анимация bounce: за 150мс масштаб cat 0→1.2, потом за 100мс 1.2→1 (через requestAnimationFrame или PIXI.Ticker).
- Вызываем this.onCoinSpend(10).
- Вызываем saveProgress({ gridState: this.grid.exportState() }) из api/client.js.

---

## 5. Интеграция: src/game/Game.js

Обнови Game.js:

init(userName):
- Удали временный заголовок с именем из TASK-001.
- Вызови const profile = await fetchProfile() из api/client.js.
- Создай const grid = new Grid(this.app).
  - Центрируй Grid на сцене:
    - gridWidth = 5 * (CONFIG.CELL_SIZE + CONFIG.GRID_PADDING) + CONFIG.GRID_PADDING
    - grid.x = (CONFIG.GAME_WIDTH - gridWidth) / 2
    - grid.y = 120 (отступ сверху под HUD)
- Если profile.user.gridState — строка, парсируй JSON.parse(). Передай в grid.importState().
- this.app.stage.addChild(grid).
- Создай const spawnSystem = new SpawnSystem(this.app, grid, (cost) => {
    // пока просто console.log
    console.log('Потрачено монет:', cost);
  }).
- Позиционируй SpawnSystem: x = CONFIG.GAME_WIDTH / 2 - 100, y = grid.y + gridWidth + 20.
- this.app.stage.addChild(spawnSystem).

Не забудь добавить импорты:
import { Grid } from './Grid.js';
import { Cat } from './Cat.js';
import { SpawnSystem } from './SpawnSystem.js';
import { fetchProfile, saveProgress } from '../api/client.js';

Сделай метод init() асинхронным (async).
В main.js: game.init(userName) → await game.init(userName).

---

## ✅ Критерии приёмки

1. Открывается экран с сеткой 5×5 (красивые ячейки на тёмном фоне).
2. Два котика 1-го уровня отображаются при первом запуске (из начального состояния сервера).
3. Кнопка «🐱 Купить котика» видна под сеткой.
4. При клике на кнопку котик появляется в свободном слоте с bounce-анимацией.
5. При перезагрузке страницы котики восстанавливаются с сервера.
6. В консоли нет ошибок.
```

---

## 📎 Что принести на ревью

1. Скриншот браузера (видна сетка + котики + кнопка).
2. Скриншот консоли (нет ошибок).
3. Если были проблемы — описание и как решил.

---

> [!IMPORTANT]
> Не переходи к TASK-004, пока PM не примет эту задачу!
