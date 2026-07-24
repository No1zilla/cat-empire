# 📌 TASK-005: Система экономики — HUD, монеты, гемы, пассивный доход

> **Статус:** 🟢 Выполнено
> **Приоритет:** Высокий
> **Зависимости:** TASK-003, TASK-004
> **Ожидаемое время:** 60–90 минут

---

## 🎯 Цель

Отобразить баланс монет и гемов в HUD-панели вверху экрана. Реализовать пассивный доход — монеты начисляются каждую секунду на основе котиков на поле. Сделать так чтобы кнопка покупки котика списывала монеты и блокировалась при нехватке. Синхронизировать баланс с сервером.

---

## 📁 Добавляемые/обновляемые файлы

```
cat-empire/src/
├── game/
│   └── Economy.js        — NEW: класс управления балансом, пассивным доходом, транзакциями
├── ui/
│   └── HUD.js            — UPDATE: реальный HUD (монеты, гемы, доход/сек)
└── game/
    ├── SpawnSystem.js    — UPDATE: проверка баланса перед покупкой, блокировка кнопки
    └── Game.js           — UPDATE: инициализация Economy, передача во все системы
```

---

## 📋 Промпт для AI-кодера

```
Реализуй систему экономики для «Империи Котиков».

Проект: Vite + PixiJS v8. Уже есть Grid, Cat, MergeEngine, DragSystem, SpawnSystem.
CONFIG → `../config.js`. API → `../api/client.js`.

---

## 1. src/game/Economy.js

Класс Economy управляет балансом и пассивным доходом.

constructor(grid):
- this.grid = grid
- this.coins = 0
- this.gems = 0
- this.incomePerSecond = 0
- this._ticker = null          // интервал начисления дохода
- this.onUpdate = null         // коллбэк (coins, gems, ips) => void — вызывается при любом изменении

setBalance(coins, gems):
- this.coins = coins
- this.gems = gems
- this._recalcIncome()
- this._notify()

_recalcIncome():
- Перебирает this.grid.slots, считает incomePerSecond:
  - Для каждого котика: доход = Math.pow(3, cat.level - 1).
  - Суммирует.
- this.incomePerSecond = результат.

startTicker():
- Запускает setInterval каждые 1000мс:
  - this.coins += this.incomePerSecond
  - this._recalcIncome()  // пересчёт на случай изменения поля
  - this._notify()

stopTicker():
- clearInterval(this._ticker)

_notify():
- Если this.onUpdate: вызвать this.onUpdate(this.coins, this.gems, this.incomePerSecond)

canAfford(cost):
- return this.coins >= cost

spend(coins = 0, gems = 0):
- Если !this.canAfford(coins): throw new Error('Недостаточно монет')
- this.coins -= coins
- this.gems -= gems
- this._notify()

recalcAfterMerge():
- Вызывается после каждого merge/спавна.
- this._recalcIncome()
- this._notify()

---

## 2. src/ui/HUD.js

Класс HUD расширяет PIXI.Container.

constructor(app):
- super()
- this.app = app
- this._coinsText = null
- this._gemsText = null
- this._ipsText = null    // income per second
- this._draw()

_draw():
- Рисует фоновую панель 400×90 (CONFIG.GAME_WIDTH × 90):
  - PIXI.Graphics roundRect(0, 0, 400, 90, 0) с заливкой CONFIG.COLORS.GRID_BG.
- Иконка монеты: Text '🪙' fontSize 22 на позиции (15, 15).
- this._coinsText: Text '0', fontSize 20, fontWeight bold, fill CONFIG.COLORS.GOLD, позиция (42, 16).
- Иконка гема: Text '💎' fontSize 22 на позиции (15, 48).
- this._gemsText: Text '0', fontSize 20, fontWeight bold, fill '#a8d8ff', позиция (42, 49).
- this._ipsText: Text '+0/сек', fontSize 13, fill CONFIG.COLORS.TEXT_DIM, позиция (CONFIG.GAME_WIDTH - 90, 36).

update(coins, gems, incomePerSecond):
- this._coinsText.text = Math.floor(coins).toLocaleString('ru-RU')
- this._gemsText.text = gems
- this._ipsText.text = `+${Math.floor(incomePerSecond)}/сек`

---

## 3. Обновление SpawnSystem.js

В конструктор добавь параметр economy:
- constructor(app, grid, economy, onCoinSpend)
- this.economy = economy

В _spawnCat():
- Перед созданием кота:
  const SPAWN_COST = 10;
  if (!this.economy.canAfford(SPAWN_COST)) {
    // Показать текст-предупреждение «Мало монет!» на 1 секунду над кнопкой
    this._showNotEnoughCoins();
    return;
  }
  this.economy.spend(SPAWN_COST);

_showNotEnoughCoins():
- Создаёт временный PIXI.Text 'Мало монет! 🪙' (fontSize 14, fill '#e94560').
- Позиционирует над кнопкой (x: 0, y: -28).
- Через 1000мс удаляет из this.

В _spawnCat() после grid.addCat:
- this.economy.recalcAfterMerge()

---

## 4. Обновление Game.js

Добавь импорты:
import { Economy } from './Economy.js';
import { HUD } from '../ui/HUD.js';

В async init():

ПОСЛЕ создания grid и importState:

// Создание экономики
this.economy = new Economy(this.grid);

// Создание HUD
this.hud = new HUD(this.app);
this.hud.position.set(0, 0);
this.app.stage.addChild(this.hud);

// Колбэк обновления HUD при изменении баланса
this.economy.onUpdate = (coins, gems, ips) => {
  this.hud.update(coins, gems, ips);
};

// Загрузка баланса с сервера
let startCoins = 100, startGems = 10;
try {
  const profile = await fetchProfile();
  if (profile?.user) {
    startCoins = profile.user.coins ?? 100;
    startGems  = profile.user.gems  ?? 10;
  }
} catch (e) { /* уже логируется выше */ }

this.economy.setBalance(startCoins, startGems);
this.economy.startTicker();

// Передать economy в SpawnSystem (обнови конструктор SpawnSystem)
// SpawnSystem: constructor(app, grid, economy, onCoinSpend)
this.spawnSystem = new SpawnSystem(this.app, this.grid, this.economy, (cost) => {
  console.log('Потрачено:', cost);
});

// Авто-сохранение баланса каждые 30 секунд
setInterval(async () => {
  try {
    await saveProgress({
      coins: this.economy.coins,
      gems:  this.economy.gems,
      gridState: this.grid.exportState()
    });
  } catch(e) { console.error('Авто-сохранение:', e); }
}, 30000);

// Также обновлять onStateChange у DragSystem, чтобы сохранял и баланс
this.dragSystem.onStateChange = async () => {
  this.economy.recalcAfterMerge();
  try {
    await saveProgress({
      coins: this.economy.coins,
      gems:  this.economy.gems,
      gridState: this.grid.exportState()
    });
  } catch(e) { console.error('Сохранение после action:', e); }
};
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Вверху экрана видна панель HUD с иконками монет, гемов и доходом/сек |
| 2 | При запуске баланс загружается с сервера |
| 3 | Монеты тикают вверх каждую секунду (соответствует котикам на поле) |
| 4 | Котик уровня N даёт 3^(N-1) монет/сек |
| 5 | Кнопка «Купить котика» списывает 10 монет |
| 6 | При нехватке монет показывается «Мало монет! 🪙», котик не спавнится |
| 7 | После merge пересчитывается доход/сек в HUD |
| 8 | Баланс автосохраняется каждые 30 сек и при каждом действии |

---

## 📎 Что принести на ревью

1. Скриншот HUD с ненулевым балансом и доходом/сек.
2. Скриншот: у котика уровня 2 доход = 3/сек, уровня 3 = 9/сек (проверить в консоли).
3. Скриншот консоли (нет ошибок).

---

> [!IMPORTANT]
> Не переходи к TASK-006, пока PM не примет задачу!
