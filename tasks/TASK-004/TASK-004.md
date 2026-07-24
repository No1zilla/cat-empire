# 📌 TASK-004: Drag-and-drop + Merge-механика

> **Статус:** 🟢 Выполнено
> **Приоритет:** Критический
> **Зависимости:** TASK-003
> **Ожидаемое время:** 60–90 минут

---

## 🎯 Цель

Реализовать перетаскивание котиков по сетке мышью/пальцем. При перетаскивании котика одного уровня на котика того же уровня — объединять их (merge) в котика уровня+1. Анимировать merge. Сохранять новое состояние на сервер.

---

## 📁 Добавляемые/обновляемые файлы

```
cat-empire/src/
└── game/
    ├── DragSystem.js    — NEW: управляет drag-and-drop для всех котиков на сетке
    ├── MergeEngine.js   — NEW: логика проверки и выполнения merge
    └── Grid.js          — UPDATE: добавить метод getCatAtSlot(slotIndex)
```

---

## 📋 Промпт для AI-кодера

```
Реализуй drag-and-drop и merge-механику для игры «Империя Котиков».

Проект уже существует: Vite + PixiJS v8 + Express бэкенд.
Файлы Grid.js, Cat.js, SpawnSystem.js уже созданы в TASK-003.
CONFIG импортируется из `../config.js`.
saveProgress — из `../api/client.js`.

---

## 1. src/game/MergeEngine.js

Класс MergeEngine:

constructor(grid, onMerge):
- this.grid = grid
- this.onMerge = onMerge  // коллбэк: (newLevel, slotIndex) => void

canMerge(slotIndexA, slotIndexB):
- Возвращает true если:
  - slotIndexA !== slotIndexB
  - Оба слота заняты (не null)
  - Уровни котиков в обоих слотах одинаковые
  - Уровень < CONFIG.MAX_CAT_LEVEL (нельзя мерджить максимальный уровень)
- Иначе false.

merge(slotIndexA, slotIndexB):
- Если !this.canMerge(slotIndexA, slotIndexB): return null.
- Получить уровни: levelA = grid.slots[slotIndexA].level
- Удалить обоих котиков: grid.removeCat(slotIndexA), grid.removeCat(slotIndexB)
- Создать нового котика: new Cat(levelA + 1, slotIndexB)
- Добавить в слот B: grid.addCat(newCat, slotIndexB)
- Вызвать this.onMerge(levelA + 1, slotIndexB)
- Вернуть newCat.

---

## 2. src/game/DragSystem.js

Класс DragSystem:

constructor(app, grid, mergeEngine, onStateChange):
- this.app = app
- this.grid = grid
- this.mergeEngine = mergeEngine
- this.onStateChange = onStateChange  // коллбэк после любого изменения сетки
- this.dragging = null  // { cat, originalSlot, offsetX, offsetY }
- this._setupListeners()

_setupListeners():
- Перебирает все слоты сетки и вешает слушатели на котиков.
- Использует глобальный ticker PixiJS для обновления позиции при перетаскивании.

makeDraggable(cat):
- Устанавливает cat.eventMode = 'static', cat.cursor = 'grab'.
- На 'pointerdown': запоминает this.dragging = { cat, originalSlot: cat.slotIndex, offsetX, offsetY }.
  - Переносит cat на верх z-order (this.grid.addChild(cat) перемещает наверх).
  - Убирает его из slots сетки: this.grid.slots[cat.slotIndex] = null (но НЕ вызывает removeCat — котик остаётся на экране).
  - cat.alpha = 0.85.
- На 'pointermove' (на app.stage): если this.dragging === cat — обновляет позицию котика под курсором/пальцем.
- На 'pointerup' (на app.stage): вызывает this._drop().

_drop():
- Если this.dragging === null: return.
- Определяет ближайший слот по текущей позиции cat на сцене:
  - Учитывает позицию Grid на сцене (grid.x, grid.y).
  - Конвертирует глобальные координаты cat.position в локальные относительно Grid.
  - Вычисляет слот по формуле: col = Math.floor(localX / (CELL_SIZE + GRID_PADDING)), row = аналогично.
  - Если col или row выходят за [0, 4] — слот невалиден.
  - targetSlot = row * 5 + col.

- Сценарии после drop:
  A. targetSlot невалиден (вне сетки) — вернуть котика на originalSlot.
  B. targetSlot свободен — переместить кота в targetSlot: grid.slots[targetSlot] = cat, cat.slotIndex = targetSlot, позиция = grid.getSlotPosition(targetSlot).
  C. targetSlot == originalSlot — вернуть кота на место.
  D. targetSlot занят котиком того же уровня — выполнить merge:
     - Сначала вернуть кота на originalSlot (grid.slots[originalSlot] = cat).
     - Вызвать mergeEngine.merge(originalSlot, targetSlot).
     - Сделать нового котика (результат merge) draggable: this.makeDraggable(newCat).
     - Анимация: flash-эффект на targetSlot (Graphics белый круг alpha 0→1→0 за 300мс).
  E. targetSlot занят котиком другого уровня — вернуть на originalSlot.

- Восстановить: cat.alpha = 1, this.dragging = null.
- Вызвать this.onStateChange() — сохранение на сервер.

Важно: слушатели 'pointermove' и 'pointerup' вешаются на app.stage, а не на самого котика, чтобы работало при быстром движении мыши за пределы спрайта.

---

## 3. Обновление src/game/Grid.js

Добавь один метод:

getCatAtSlot(slotIndex):
- Возвращает this.slots[slotIndex] или null.

---

## 4. Интеграция в src/game/Game.js

После создания SpawnSystem добавь:

// Импортировать MergeEngine и DragSystem
import { MergeEngine } from './MergeEngine.js';
import { DragSystem } from './DragSystem.js';

// В методе init(), после this.app.stage.addChild(this.spawnSystem):

// Callback при merge — анимация и лог
const onMerge = (newLevel, slotIndex) => {
  console.log(`✨ Merge! Новый котик уровня ${newLevel} в слоте ${slotIndex}`);
};

// Callback при любом изменении состояния — авто-сохранение
const onStateChange = async () => {
  try {
    await saveProgress({ gridState: this.grid.exportState() });
  } catch (e) {
    console.error('Ошибка автосохранения:', e);
  }
};

this.mergeEngine = new MergeEngine(this.grid, onMerge);
this.dragSystem = new DragSystem(this.app, this.grid, this.mergeEngine, onStateChange);

// Сделать все существующие котики на сетке draggable
this.grid.slots.forEach((cat) => {
  if (cat !== null) this.dragSystem.makeDraggable(cat);
});

// Обновить SpawnSystem — после каждого спавна тоже делать котика draggable
// В конструкторе SpawnSystem передать dragSystem (или обновить onCoinSpend коллбэк)
// Самый простой способ — сохранить dragSystem в this и вызывать в _spawnCat:
//   this.grid.slots.forEach(cat => { if (cat) this.dragSystem?.makeDraggable(cat); });
// Добавь в SpawnSystem.js: this.dragSystem = null (публичное поле, Game.js его заполнит после создания).
// В _spawnCat после grid.addCat: if (this.dragSystem) this.dragSystem.makeDraggable(cat);
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Котика можно взять и перетащить на другой слот |
| 2 | При drop на пустой слот — котик перемещается туда |
| 3 | При drop на котика **того же уровня** — происходит merge, появляется котик уровня+1 |
| 4 | При drop на котика **другого уровня** — котик возвращается обратно |
| 5 | При drag за пределы сетки — котик возвращается обратно |
| 6 | После каждого merge состояние сохраняется на сервер |
| 7 | После перезагрузки — смёрдженный котик восстанавливается |
| 8 | В консоли нет ошибок |

---

## 📎 Что принести на ревью

1. Скриншот/запись экрана: два котика одного уровня смерджились в котика уровня+1.
2. Скриншот консоли (без ошибок).
3. Описание проблем, если были.

---

> [!IMPORTANT]
> Не переходи к TASK-005, пока PM не примет эту задачу!
