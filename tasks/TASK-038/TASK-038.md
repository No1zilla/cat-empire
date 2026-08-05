# 📌 TASK-038: Google Play Billing — In-App Purchases для Android

> **Статус:** 🟡 В очереди
> **Приоритет:** Высокий (Фаза 4 — Android)
> **Зависимости:** TASK-035, TASK-036

---

## 🎯 Описание задачи

Реализовать покупку пакетов гемов через Google Play Billing API. Аналог VK Pay из TASK-033, но для Android.

---

## 💎 Пакеты гемов (продуктовые ID)

| Product ID | Название | Гемы | Цена |
|-----------|----------|------|------|
| `gems_small` | 🐾 Котёнок | 50 💎 | 59₽ |
| `gems_medium` | 🐱 Кот | 250 💎 | 249₽ |
| `gems_large` | 👑 Король | 750 💎 | 599₽ |
| `gems_epic` | 🌟 Бог-Кот | 2000 💎 | 1499₽ |

---

## 🛠 Задачи

### 1. Установить плагин
```bash
npm install @capacitor-community/purchases
# или использовать RevenueCat (проще для кросс-платформы)
npm install @revenuecat/purchases-capacitor
```

### 2. Зарегистрировать продукты в Google Play Console
- Раздел: **Монетизация → Продукты → Разовые продукты**
- Создать 4 продукта с ID из таблицы выше
- Установить цены в рублях

### 3. Создать `src/services/IAPService.js`
```js
import { Purchases } from '@revenuecat/purchases-capacitor'

const GEM_PACKAGES = {
  gems_small:  50,
  gems_medium: 250,
  gems_large:  750,
  gems_epic:   2000
}

export async function purchaseGems(productId) {
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: productId })
    const gems = GEM_PACKAGES[productId]
    // Начислить гемы игроку
    GameState.addGems(gems)
    // Сохранить в VK Storage / LocalStorage
    await saveProgress()
    return { success: true, gems }
  } catch (e) {
    if (!e.userCancelled) console.error('IAP error:', e)
    return { success: false }
  }
}
```

### 4. UI — экран магазина гемов
- Кнопки покупки в HUD рядом с балансом гемов
- Показывать цены, полученные динамически из Google Play

### 5. Restore purchases
- Кнопка «Восстановить покупки» в настройках (требование Google Play)

---

## ✅ Критерии приёмки

- [ ] Все 4 продукта созданы в Google Play Console
- [ ] Тестовая покупка (через лицензионный тестер) проходит без ошибок
- [ ] Гемы начисляются сразу после покупки
- [ ] Restore purchases работает корректно
- [ ] Обработка ошибок: нет интернета, отмена покупки
