# 📌 TASK-006: Idle-движок — экран оффлайн-дохода

> **Статус:** 🟢 Выполнено
> **Приоритет:** Высокий
> **Зависимости:** TASK-005
> **Ожидаемое время:** 30–45 минут

---

## 🎯 Цель

Когда игрок возвращается в игру после перерыва — показать модальное окно с суммой заработанных монет за время отсутствия. Логика расчёта уже живёт на сервере (TASK-002). Задача фронтенда — красиво показать это число и начислить монеты в Economy.

---

## 📁 Добавляемые/обновляемые файлы

```
cat-empire/src/
└── ui/
    └── OfflineModal.js   — NEW: модальное окно «Пока тебя не было...»
└── game/
    └── Game.js           — UPDATE: показать OfflineModal если оффлайн-доход > 0
```

---

## 📋 Промпт для AI-кодера

```
Реализуй экран оффлайн-дохода для «Империи Котиков».

Проект: Vite + PixiJS v8. Уже есть Economy, HUD, Grid, Cat.
CONFIG → `../config.js`.

---

## 1. src/ui/OfflineModal.js

Класс OfflineModal расширяет PIXI.Container.

constructor(app, earnedCoins, onClose):
- super()
- this.app = app
- this.earnedCoins = earnedCoins
- this.onClose = onClose   // коллбэк при нажатии кнопки «Забрать»
- this._draw()

_draw():

1. Полупрозрачный overlay на весь экран:
   - PIXI.Graphics rectangle(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT).
   - fill({ color: 0x000000, alpha: 0.65 }).

2. Карточка по центру:
   - Размер 300×220, позиция x=(400-300)/2=50, y=(700-220)/2=240.
   - PIXI.Graphics roundRect(50, 240, 300, 220, 20).
   - fill(CONFIG.COLORS.GRID_BG).
   - stroke({ color: CONFIG.COLORS.ACCENT, width: 2 }).

3. Заголовок:
   - Text '😴 Пока тебя не было...'
   - fontSize: 17, fontWeight: 'bold', fill: white.
   - anchor (0.5, 0): x=200 (центр), y=260.

4. Иконка монеты большая:
   - Text '🪙'
   - fontSize: 48, anchor (0.5, 0.5): x=200, y=370.

5. Сумма заработка:
   - Text `+${Math.floor(earnedCoins).toLocaleString('ru-RU')} монет`
   - fontSize: 26, fontWeight: 'bold', fill: CONFIG.COLORS.GOLD.
   - anchor (0.5, 0.5): x=200, y=420.

6. Кнопка «Забрать!»:
   - PIXI.Graphics roundRect(100, 430, 200, 50, 12), fill(CONFIG.COLORS.ACCENT).
   - Text '👛 Забрать!' fontSize 17 bold white, anchor (0.5, 0.5): x=200, y=455.
   - eventMode='static', cursor='pointer'.
   - on('pointerdown'): alpha=0.8, вызвать this._close().
   - on('pointerover'): alpha=0.85. on('pointerout'): alpha=1.

_close():
- Если this.onClose: this.onClose().
- this.destroy({ children: true }).

---

## 2. Обновление src/game/Game.js

В async init(), после this.economy.setBalance(startCoins, startGems):

// Определяем оффлайн-доход — разница между монетами на сервере
// и базовым значением (сохранённый баланс был меньше текущего = сервер начислил оффлайн)
// Мы сравниваем coins из профиля с последним известным балансом.
// Простое решение: сервер всегда отдаёт уже начисленный баланс.
// Если пришедший баланс > 100 (начального) — показываем разницу как оффлайн-доход.
// Используй переменные: rawCoinsFromServer (профиль.user.coins) и previousCoins.
// previousCoins = сохраняй в localStorage при каждом авто-сохранении.

const previousCoins = parseFloat(localStorage.getItem('cat_empire_last_coins') || '0');
const offlineEarned = Math.max(0, startCoins - previousCoins);

if (offlineEarned > 1) {
  // Показать модальное окно
  const modal = new OfflineModal(this.app, offlineEarned, () => {
    // Начислить монеты (они уже в startCoins, просто скрываем модалку)
    console.log('Оффлайн-доход получен:', offlineEarned);
  });
  this.app.stage.addChild(modal);
}

// Сохранить текущий баланс в localStorage
localStorage.setItem('cat_empire_last_coins', String(startCoins));

// В авто-сохранение (setInterval 30 сек) добавить:
localStorage.setItem('cat_empire_last_coins', String(this.economy.coins));

Добавь импорт:
import { OfflineModal } from '../ui/OfflineModal.js';
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | При первом запуске (монеты = 100, предыдущих нет) модалка НЕ показывается |
| 2 | Если открыть игру спустя время (монеты выросли на сервере) — модалка появляется |
| 3 | Модалка показывает корректную сумму оффлайн-дохода |
| 4 | При нажатии «Забрать!» модалка закрывается, монеты остаются в HUD |
| 5 | Overlay затемняет игровое поле за модалкой |
| 6 | В консоли нет ошибок |

---

## 📎 Как проверить оффлайн-доход без реального ожидания

1. Открой игру, подожди 10 секунд.
2. В DevTools → Application → Local Storage: удали `cat_empire_last_coins`.
3. Обнови страницу — должна появиться модалка (сервер начислил доход за прошедшее время).

---

> [!IMPORTANT]
> Не переходи к TASK-007, пока PM не примет задачу!
