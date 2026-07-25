# 📌 TASK-013: Перебалансировка экономики — экспоненциальный ценник и математическая модель

> **Статус:** 🟡 В работе
> **Приоритет:** Критический (Баланс игры)
> **Зависимости:** TASK-005
> **Ожидаемое время:** 30–45 минут

---

## 🎯 Цель

Устранить гиперинфляцию (когда монеты исчисляются миллионами, а котик всегда стоит 10 монет).

Применить проверенную математическую модель Idle-игр (Idle Tycoon / Merge Mansion):

1. **Экспоненциальная инфляция цены:** `CatCost = Math.floor(10 * Math.pow(1.15, totalCatsBought))`
2. **Сбалансированная формула пассивного дохода:** `Income = Math.pow(2, level - 1)`

---

## 📐 Математическая модель экономики

| Конечный котик | Куплено котиков 1-го ур. | Цена последнего кота | Суммарные затраты монет | Доход ($2^{N-1}$) | Время накопления |
|---|---|---|---|---|---|
| **Уровень 1** | 1 | 10 🪙 | 10 🪙 | 1 🪙/сек | ~10 сек |
| **Уровень 2** | 2 | 11 🪙 | 21 🪙 | 2 🪙/сек | ~10 сек |
| **Уровень 3** | 4 | 15 🪙 | 49 🪙 | 4 🪙/сек | ~12 сек |
| **Уровень 4** | 8 | 26 🪙 | 137 🪙 | 8 🪙/сек | ~17 сек |
| **Уровень 5** | 16 | 87 🪙 | 557 🪙 | 16 🪙/сек | ~35 сек |
| **Уровень 6** | 32 | 761 🪙 | 5 769 🪙 | 32 🪙/сек | ~3 мин |
| **Уровень 7** | 64 | 66 600 🪙 | 510 800 🪙 | 64 🪙/сек | ~2 часа (с оффлайном) |

---

## 📁 Добавляемые/обновляемые файлы

```
cat-empire/src/
├── utils/
│   └── catVisuals.js     — UPDATE: формула дохода = Math.pow(2, level - 1)
├── game/
│   ├── Economy.js        — UPDATE: totalCatsBought, расчет getCatCost() по инфляционной формуле
│   └── SpawnSystem.js    — UPDATE: динамическое обновление текста кнопки «Купить котика (N монет)»
└── server/
    └── src/services/userService.js — UPDATE: оффлайн-доход по формуле Math.pow(2, level - 1)
```

---

## 📋 Промпт для AI-кодера

```
Реализуй перебалансировку экономики по математической модели 1.15^N инфляции.

Проект: Vite + PixiJS v8 + Express бэкенд.

---

## 1. Формула дохода (src/utils/catVisuals.js и server/src/services/userService.js)

```javascript
// Доход котика уровня N = 2^(N - 1)
export function getCatData(level) {
  const baseData = CAT_CONFIG[level] || CAT_CONFIG[1];
  return {
    ...baseData,
    income: Math.pow(2, level - 1)
  };
}
```

---

## 2. Динамическая цена с инфляцией 15% (src/game/Economy.js)

```javascript
// В constructor Economy:
this.totalCatsBought = 0; // количество купленных котиков за всю историю

// Расчет стоимости следующего котика:
getCatCost() {
  const baseCost = 10;
  const growthFactor = 1.15;
  return Math.floor(baseCost * Math.pow(growthFactor, this.totalCatsBought));
}

// При спавне:
spendCatPurchase() {
  const cost = this.getCatCost();
  if (!this.canAfford(cost)) {
    throw new Error('Недостаточно монет');
  }
  this.spend(cost);
  this.totalCatsBought += 1;
  this._notify();
}
```

---

## 3. Обновление текста на кнопке (src/game/SpawnSystem.js)

Кнопка спавна должна моментально перерисовывать актуальную цену после каждой покупки:

```javascript
updateButtonText() {
  const cost = this.economy.getCatCost();
  const formattedCost = cost >= 10000 ? Math.floor(cost).toLocaleString('ru-RU') : cost;
  if (this.btnText) {
    this.btnText.text = `🐱 Купить котика (${formattedCost} монет)`;
  }
}
```

---

## 4. Сохранение количества покупок

Передавать `totalCatsBought` в объект сохранения:
`saveProgress({ coins, gems, gridState, totalCatsBought })`.
```

---

## ✅ Критерии приёмки

| # | Проверка |
|---|---------|
| 1 | Первая покупка котика стоит 10 монет |
| 2 | С каждой покупкой цена вырастает на 15% (10 → 11 → 13 → 15 → 17 → 20...) |
| 3 | Кнопка покупки сразу показывает обновлённую стоимость |
| 4 | Пассивный доход пересчитан по формуле $2^{N-1}$ |
| 5 | Прогресс до 7 уровня занимает не 1 минуту, а требует обдуманной игры и времени |
| 6 | В консоли нет ошибок |
