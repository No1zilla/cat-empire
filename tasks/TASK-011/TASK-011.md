# 📌 TASK-011: Подсветка парных котиков (Merge Highlight & Glow)

> **Статус:** 🟡 В работе
> **Приоритет:** Средний
> **Зависимости:** TASK-003, TASK-004
> **Ожидаемое время:** 30–45 минут

---

## 🎯 Цель

Сделать игровой процесс еще более интуитивным и сочным:
1. **Пассивная подсветка одинаковых котиков:** если на поле стоят 2 или более котика одного уровня — вокруг них появляется пульсирующее свечение (свечение парами). Это сразу привлекает внимание игрока и показывает готовые совпадения.
2. **Активная подсветка при перетаскивании (Drag Highlight):** когда игрок берет котика уровня N и начинает его тащить — все другие котики уровня N на сетке начинают ярко пульсировать и подсвечиваются золотой рамкой (показывает валидные цели для слияния).

---

## 📁 Добавляемые/обновляемые файлы

```
cat-empire/src/game/
├── Grid.js          — UPDATE: динамическое обновление подсветки ячеек/котиков
├── Cat.js           — UPDATE: методы setGlow(active, color) для включения/выключения ауры
└── DragSystem.js    — UPDATE: подсвечивать одинаковых котиков при начале drag и гасить при drop
```

---

## 📋 Промпт для AI-кодера

```
Реализуй систему пульсирующей подсветки парных котиков для «Империи Котиков».

Проект: Vite + PixiJS v8.
Файлы Grid.js, Cat.js, DragSystem.js уже созданы.

---

## 1. Обновление src/game/Cat.js

Добавь визуальный эффект свечения (Glow/Aura):

```javascript
// В constructor Cat.js:
this._glowEffect = null;

// Метод управления свечением
setGlow(enabled, color = 0xffd700) {
  if (enabled) {
    if (!this._glowEffect) {
      // Рисуем круговую ауру или подложку со свечением под котиком
      const cardSize = CONFIG.CELL_SIZE - 10;
      const glow = new PIXI.Graphics();
      glow.roundRect(-4, -4, cardSize + 8, cardSize + 8, 14);
      glow.fill({ color: color, alpha: 0.35 });
      glow.stroke({ color: color, width: 2, alpha: 0.8 });

      this.addChildAt(glow, 0); // под спрайтом котика
      this._glowEffect = glow;

      // Анимация пульсации ауры через alpha
      this._animateGlow();
    }
  } else {
    if (this._glowEffect) {
      if (this._glowRaf) cancelAnimationFrame(this._glowRaf);
      this.removeChild(this._glowEffect);
      this._glowEffect.destroy();
      this._glowEffect = null;
    }
  }
}

_animateGlow() {
  const startTime = Date.now();
  const tick = () => {
    if (!this._glowEffect || this.destroyed) return;
    const elapsed = Date.now() - startTime;
    // Пульсация альфы 0.2 <-> 0.6 с периодом 1000мс
    this._glowEffect.alpha = 0.4 + Math.sin(elapsed * 0.005) * 0.2;
    this._glowRaf = requestAnimationFrame(tick);
  };
  this._glowRaf = requestAnimationFrame(tick);
}
```

---

## 2. Обновление src/game/Grid.js

Добавь метод проверки парных котиков на сетке:

```javascript
// Проверка, есть ли у котика в слоте slotIndex сосед такого же уровня в смежных ячейках (слева, справа, сверху, снизу)
hasAdjacentMatchingCat(slotIndex) {
  const cat = this.slots[slotIndex];
  if (!cat) return false;

  const col = slotIndex % 5;
  const row = Math.floor(slotIndex / 5);

  // Смежные координаты (крестом): влево, вправо, вверх, вниз
  const neighbors = [];
  if (col > 0) neighbors.push(slotIndex - 1);       // лево
  if (col < 4) neighbors.push(slotIndex + 1);       // право
  if (row > 0) neighbors.push(slotIndex - 5);       // верх
  if (row < 4) neighbors.push(slotIndex + 5);       // низ

  return neighbors.some(neighborIndex => {
    const neighborCat = this.slots[neighborIndex];
    return neighborCat !== null && neighborCat.level === cat.level;
  });
}

// Подсветить котики на сетке
updatePairHighlights(activeDragLevel = null) {
  this.slots.forEach((cat, index) => {
    if (cat !== null) {
      if (activeDragLevel !== null) {
        // Режим drag: подсвечивать ВСЕ мишени того же уровня на поле ярким изумрудом
        const isMatch = cat.level === activeDragLevel;
        cat.setGlow(isMatch, 0x00ff88);
      } else {
        // Режим покоя: подсвечивать ТОЛЬКО котиков, которые стоят СМЕЖНО (РЯДОМ) со своим дубликатом!
        const isAdjacentPair = this.hasAdjacentMatchingCat(index);
        cat.setGlow(isAdjacentPair, 0xffd700); // мягкое золотое свечение
      }
    }
  });
}
```

Вызывай `this.updatePairHighlights()` при:
- `addCat()`
- `removeCat()`
- `importState()`

---

## 3. Обновление src/game/DragSystem.js

В `pointerdown` (при начале перетаскивания котика):
- Получить `draggedLevel = cat.level`
- Вызвать `this.grid.updatePairHighlights(draggedLevel)`

В `_drop()` (при отпускании котика):
- Вызвать `this.grid.updatePairHighlights(null)` (сброс к дефолтному парному свечению)
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Если на поле есть 2 котика 1-го уровня — они мягко пульсируют золотым светом |
| 2 | Одиночный котик (без пары) не светится |
| 3 | При захвате котика — все потенциальные пары для него подсвечиваются ярким изумрудным светом |
| 4 | При броске котика свечение пересчитывается автоматически |
| 5 | В консоли нет ошибок |

---

## 📎 Что принести на ревью

1. Скриншот поля с подсвеченными парными котиками.
2. Скриншот в процессе drag — видно как подсвечиваются мишени слияния.
