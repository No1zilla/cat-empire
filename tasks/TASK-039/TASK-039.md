# 📌 TASK-039: Firebase Analytics — Аналитика и воронка конверсии

> **Статус:** 🟡 В очереди
> **Приоритет:** Средний (Фаза 4 — Android)
> **Зависимости:** TASK-035

---

## 🎯 Описание задачи

Подключить Firebase Analytics для отслеживания поведения игроков. Без аналитики — работа вслепую: непонятно где люди уходят, что работает, что не работает.

---

## 📊 Ключевые события для отслеживания

| Событие | Когда | Параметры |
|---------|-------|-----------|
| `tutorial_complete` | Завершил туториал | — |
| `first_merge` | Первое слияние котиков | `cat_level` |
| `cat_unlocked` | Открыт новый котик | `cat_level`, `cat_name` |
| `ad_watched` | Просмотрел рекламу | `placement` (hud/offline/automerge) |
| `gem_spent` | Потрачены гемы | `amount`, `reason` |
| `iap_started` | Открыл магазин | — |
| `iap_completed` | Купил гемы | `product_id`, `gems` |
| `daily_login` | Ежедневный вход | `day_streak` |
| `invite_sent` | Отправил инвайт | — |
| `prestige` | Перерождение | `prestige_count` |
| `session_start` | Начало сессии | — |

---

## 🛠 Задачи

### 1. Создать Firebase проект
- [console.firebase.google.com](https://console.firebase.google.com)
- Добавить Android-приложение с `ru.catempire.game`
- Скачать `google-services.json` → положить в `android/app/`

### 2. Установить плагин
```bash
npm install @capacitor-firebase/analytics
npx cap sync android
```

### 3. Создать `src/services/AnalyticsService.js`
```js
import { FirebaseAnalytics } from '@capacitor-firebase/analytics'
import { PlatformService } from './PlatformService.js'

export async function trackEvent(name, params = {}) {
  if (PlatformService.isAndroid()) {
    await FirebaseAnalytics.logEvent({ name, params })
  }
  // В VK-версии можно добавить VK Stats позже
}

// Хелперы:
export const track = {
  tutorialComplete: () => trackEvent('tutorial_complete'),
  catUnlocked: (level, name) => trackEvent('cat_unlocked', { cat_level: level, cat_name: name }),
  adWatched: (placement) => trackEvent('ad_watched', { placement }),
  gemSpent: (amount, reason) => trackEvent('gem_spent', { amount, reason }),
  iapCompleted: (productId, gems) => trackEvent('iap_completed', { product_id: productId, gems }),
  dailyLogin: (streak) => trackEvent('daily_login', { day_streak: streak }),
}
```

### 4. Расставить вызовы в коде
- `track.tutorialComplete()` → в `TutorialSystem.js`
- `track.catUnlocked()` → в `NewCatModal.js`
- `track.adWatched()` → в `AdService.js`
- `track.dailyLogin()` → в `DailyLoginSystem.js`

---

## ✅ Критерии приёмки

- [ ] `google-services.json` добавлен в проект
- [ ] События видны в Firebase Console → DebugView в реальном времени
- [ ] Воронка `tutorial → first_merge → cat_unlocked → ad_watched` отслеживается
- [ ] В VK-сборке Firebase НЕ вызывается (нет ошибок)
