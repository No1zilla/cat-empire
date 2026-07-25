# 📌 TASK-009: Туториал — «Как играть» (первый запуск)

> **Статус:** 🟡 В работе
> **Приоритет:** Средний
> **Зависимости:** TASK-003, TASK-004
> **Ожидаемое время:** 30–45 минут

---

## 🎯 Цель

При **первом запуске** игры показать простой пошаговый туториал из 3 шагов:
1. Купи котика → 2. Перетащи на такого же → 3. Они объединились!

После туториала — больше никогда не показывать (флаг в `localStorage`).

---

## 📁 Создаваемые файлы

```
cat-empire/src/
└── ui/
    └── Tutorial.js    — NEW: класс пошагового туториала
```

---

## 📋 Промпт для AI-кодера

```
Реализуй туториал первого запуска для «Империи Котиков».

Проект: Vite + PixiJS v8.
CONFIG → `../config.js`. Туториал показывается поверх игры как overlay.

---

## 1. src/ui/Tutorial.js

Класс Tutorial расширяет PIXI.Container.

Туториал состоит из 3 шагов. На каждом шаге:
- Затемнённый overlay на весь экран (кроме подсвеченной зоны).
- Карточка с текстом и стрелкой (указывает на нужный элемент).
- Анимированная «рука» 👆, показывающая что делать.
- Кнопка «Понятно!» для перехода к следующему шагу.

---

### constructor(app, onComplete)

- super()
- this.app = app
- this.onComplete = onComplete
- this.currentStep = 0
- this.steps = [
    {
      title: '🐱 Покупай котиков!',
      text: 'Нажми кнопку\n«Купить котика»,\nчтобы добавить\nкотика на поле.',
      highlightTarget: 'button',   // подсветить зону кнопки внизу
      handStartX: 200, handStartY: 580,
      handEndX: 200,   handEndY: 640,  // стрелка вниз к кнопке
    },
    {
      title: '🔀 Перетаскивай!',
      text: 'Возьми котика\nи перетащи его\nна другого такого\nже котика.',
      highlightTarget: 'grid',   // подсветить сетку
      handStartX: 120, handStartY: 260,
      handEndX: 200,   handEndY: 260,  // стрелка вправо по сетке
    },
    {
      title: '✨ Они объединились!',
      text: 'Два одинаковых\nкотика сливаются\nв одного более\nсильного!',
      highlightTarget: 'center',  // подсветить центр сетки
      handStartX: 200, handStartY: 350,
      handEndX: 200,   handEndY: 300,
    }
  ]
- this._showStep(0)

---

### _showStep(stepIndex)

- Очищает this (removeChildren).
- Если stepIndex >= this.steps.length: вызывает this._complete() и return.

1. Тёмный overlay:
   - PIXI.Graphics rectangle(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT).
   - fill({ color: 0x000000, alpha: 0.72 }).

2. Вырез (spotlight) для подсветки нужной зоны:
   - Если highlightTarget === 'button':
     spotlight: roundRect(60, 615, 280, 58, 12) — зона кнопки покупки.
   - Если highlightTarget === 'grid':
     spotlight: roundRect(25, 115, 350, 350, 16) — зона сетки.
   - Если highlightTarget === 'center':
     spotlight: circle(200, 290, 80) — центр сетки.
   - Нарисовать spotlight как PIXI.Graphics с fill({ color: 0xffffff, alpha: 0.12 })
     и stroke({ color: 0xffd700, width: 2, alpha: 0.9 }).

3. Карточка с подсказкой:
   - roundRect(30, 430, 340, 170, 16) — если шаг 0 или 2.
   - roundRect(30, 480, 340, 150, 16) — если шаг 1.
   - fill(CONFIG.COLORS.GRID_BG), stroke({ color: CONFIG.COLORS.ACCENT, width: 2 }).
   - Заголовок: this.steps[stepIndex].title, fontSize: 18, fontWeight: bold, fill: white, x: 200, y: карточка.y + 24, anchor (0.5, 0).
   - Текст: this.steps[stepIndex].text, fontSize: 14, fill: '#cccccc', align: center, x: 200, y: карточка.y + 58, anchor (0.5, 0).

4. Кнопка «Понятно!»:
   - roundRect(110, карточка.y + карточка.height - 52, 180, 40, 10).
   - fill(CONFIG.COLORS.ACCENT).
   - Text 'Понятно! →', fontSize: 15, bold, white, по центру кнопки.
   - eventMode='static', cursor='pointer'.
   - on('pointerdown'): this._showStep(stepIndex + 1).

5. Анимированная рука 👆:
   - Text '👆', fontSize: 32.
   - Анимация туда-обратно между (handStartX, handStartY) и (handEndX, handEndY).
   - Цикличная анимация через requestAnimationFrame, период 1200мс.
   - Сохранить raf id в this._handRaf.

6. Счётчик шагов:
   - Три точки (●●●) внизу карточки, текущий шаг — цветной (ACCENT), остальные серые.
   - Text для каждой точки: '●', fontSize: 12, x: 170 + i*20, y: карточка.y + карточка.height - 16.

---

### _complete()

- Отменить this._handRaf.
- localStorage.setItem('cat_empire_tutorial_done', '1').
- Вызвать this.onComplete().
- this.destroy({ children: true }).

---

## 2. Интеграция в src/game/Game.js

Добавь импорт:
import { Tutorial } from '../ui/Tutorial.js';

В конце async init(), после создания всех объектов:

// Показать туториал только при первом запуске
const tutorialDone = localStorage.getItem('cat_empire_tutorial_done');
if (!tutorialDone) {
  const tutorial = new Tutorial(this.app, () => {
    console.log('Туториал завершён!');
  });
  this.app.stage.addChild(tutorial);
}
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | При первом запуске туториал появляется поверх игры |
| 2 | Шаг 1: подсвечена кнопка покупки, рука анимированно указывает на неё |
| 3 | Шаг 2: подсвечена сетка, рука показывает перетаскивание |
| 4 | Шаг 3: подсвечен центр сетки, текст про объединение |
| 5 | Кнопка «Понятно! →» переключает шаги |
| 6 | Точки-индикаторы (●●●) показывают текущий шаг |
| 7 | После 3-го шага туториал исчезает и больше не появляется |
| 8 | При повторном заходе туториал НЕ показывается (localStorage) |
| 9 | В консоли нет ошибок |

---

## 📎 Что принести на ревью

1. Скриншот каждого из 3 шагов туториала.
2. Подтверждение: при повторной загрузке страницы туториал не появляется.

---

> [!IMPORTANT]
> Не переходи к следующей задаче, пока PM не примет!
