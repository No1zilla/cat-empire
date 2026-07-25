# 📌 TASK-010: Котопедия (Коллекция) + Wow-экран открытия новых котиков

> **Статус:** 🟡 В работе
> **Приоритет:** Высокий
> **Зависимости:** TASK-005, TASK-008
> **Ожидаемое время:** 60–90 минут

---

## 🎯 Цель

Удержать интерес игрока и добавить коллекционный азарт (синдром «собери их всех»).

1. **Wow-экран при открытии нового кота:** когда игрок впервые получает котика нового уровня — всплывает красивое окно с салютом, показом персонажа, его характеристиками и наградой в 💎 гемах.
2. **Котопедия (Коллекция котиков 📖):** отдельный экран-каталог всех 15 котиков. Открытые котики подсвечены, заблокированные — тёмные силуэты ❓.

---

## 📁 Добавляемые/обновляемые файлы

```
cat-empire/src/
├── ui/
│   ├── NewCatModal.js    — NEW: Wow-экран при первичном разблокировании кота
│   ├── CollectionModal.js — NEW: Экран коллекции (Котопедия 15 карточек)
│   └── HUD.js            — UPDATE: добавить кнопку 📖 Коллекция в верхний HUD
└── game/
    ├── Economy.js        — UPDATE: отслеживать maxCatLevel и выдавать награду за новых котиков
    └── Game.js           — UPDATE: обработка открытия нового котика и связка окон
```

---

## 📋 Промпт для AI-кодера

```
Реализуй Котопедию (коллекцию) и Wow-экран открытия нового кота для «Империи Котиков».

Проект: Vite + PixiJS v8.
CONFIG → `../config.js`, getCatData → `../utils/catVisuals.js`, getCatTexture → `../utils/catTextures.js`.

---

## 1. src/ui/NewCatModal.js

Класс NewCatModal расширяет PIXI.Container.

constructor(app, level, rewardGems, onClose):
- super()
- this.app = app
- this.level = level
- this.rewardGems = rewardGems
- this.onClose = onClose
- this._draw()

_draw():
1. Тёмный полупрозрачный overlay (alpha 0.75) на весь экран.
2. Карточка по центру (320×360, x=40, y=170, bg CONFIG.COLORS.GRID_BG, stroke gold, roundRect 20).
3. Заголовок "🎉 НОВЫЙ КОТИК В КОЛЛЕКЦИИ!", fontSize 17, bold, gold, anchor (0.5, 0), x=200, y=195.
4. Большое изображение котика (Sprite из getCatTexture(level) или Text эмодзи), размер ~120px, по центру x=200, y=280.
5. Анимация лучей/сияния за котиком (PIXI.Graphics вращающиеся лучи или круг-вспышка).
6. Название кота: getCatData(level).name, fontSize 22, bold, white, x=200, y=360, anchor (0.5, 0.5).
7. Характеристика: `Доход: +${getCatData(level).income}/сек`, fontSize 14, fill CONFIG.COLORS.TEXT_DIM, x=200, y=390.
8. Награда: `Награда: +${rewardGems} 💎`, fontSize 16, bold, fill '#a8d8ff', x=200, y=420.
9. Кнопка «Круто!»: roundRect(100, 460, 200, 48, 12), fill ACCENT, text 'Круто! 🚀'.
   - pointerdown: trigger onClose, destroy modal.

---

## 2. src/ui/CollectionModal.js

Класс CollectionModal расширяет PIXI.Container.

constructor(app, maxCatLevel, onClose):
- super()
- this.app = app
- this.maxCatLevel = maxCatLevel  // максимальный открытый уровень кота
- this.onClose = onClose
- this._draw()

_draw():
1. Overlay (alpha 0.8) на весь экран.
2. Панель альбома (360×580, x=20, y=60, roundRect 20, fill GRID_BG, stroke ACCENT).
3. Заголовок: "📖 Котопедия (Открыто N/15)", fontSize 20, bold, white, x=200, y=85, anchor (0.5, 0).
4. Кнопка закрытия ❌ в правом верхнем углу (x=350, y=75, cursor pointer).
5. Сетка карточек 3 столбца × 5 строк (15 ячеек):
   - Размеры ячейки: 95×90, padding 10px.
   - For level = 1..15:
     - isUnlocked = level <= maxCatLevel.
     - Если isUnlocked:
       - Показать иконку/спрайт кота, уровень "Lvl N", имя (мелко), доход.
       - Фон ячейки: слегка подсвечен, скругление 10.
     - Если !isUnlocked:
       - Фон тёмный. Иконка ❓ или тёмный силуэт. Уровень "Lvl N", имя "???".

---

## 3. Интеграция в HUD.js и Game.js

В `HUD.js`:
- Добавить кнопку 📖 (Иконка книги/коллекции) в верхний правый угол HUD (x=CONFIG.GAME_WIDTH - 40, y=15).
- При клике вызывается `onOpenCollection()` коллбэк.

В `Game.js`:
- При выполнении merge: если `newLevel > user.maxCatLevel`:
  - Обновить `user.maxCatLevel = newLevel`.
  - Начислить бонусные гемы `economy.gems += newLevel * 2`.
  - Показать `NewCatModal`.
  - Сохранить `maxCatLevel` и `gems` на бэкенд (`saveProgress`).
- При клике на 📖 в HUD — показать `CollectionModal(app, user.maxCatLevel)`.
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Вверху экрана в HUD появилась кнопка 📖 (Котопедия) |
| 2 | При клике на 📖 открывается модальное окно со всеми 15 котиками |
| 3 | Открытые котики подсвечены с именами и доходом, не открытые — под ❓ |
| 4 | При ПЕРВОМ слиянии в новый уровень всплывает Wow-экран «🎉 Новый котик!» |
| 5 | За открытие нового котика начисляются бонусные гемы (💎) |
| 6 | Прогресс разблокированных котиков сохраняется на сервере |

---

## 📎 Что принести на ревью

1. Скриншот Котопедии с частично открытыми котиками (например, 7/15).
2. Скриншот Wow-экрана при открытии нового кота.
