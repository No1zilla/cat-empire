# 📌 TASK-037: Google AdMob — Rewarded Video Ads для Android

> **Статус:** 🟡 В очереди
> **Приоритет:** Высокий (Фаза 4 — Android)
> **Зависимости:** TASK-035, TASK-036

---

## 🎯 Описание задачи

Заменить VK Rewarded Ads на Google AdMob для Android-сборки. Та же логика 5 точек монетизации (из TASK-007), только через AdMob SDK вместо VK Bridge.

---

## 🛠 Задачи

### 1. Зарегистрировать приложение в AdMob
- Создать аккаунт: [admob.google.com](https://admob.google.com)
- Добавить приложение → получить `App ID` (вида `ca-app-pub-XXXXXXXX~XXXXXXXXXX`)
- Создать рекламный блок типа **Rewarded Video** → получить `Ad Unit ID`

### 2. Установить Capacitor плагин AdMob
```bash
npm install @capacitor-community/admob
npx cap sync android
```

### 3. Настроить `AndroidManifest.xml`
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-XXXXXXXX~XXXXXXXXXX"/>
```

### 4. Создать `src/services/AdService.js`
```js
import { PlatformService } from './PlatformService.js'
import { AdMob } from '@capacitor-community/admob'

const AD_UNIT_ID = 'ca-app-pub-XXXXXXXX/XXXXXXXXXX' // prod
const AD_UNIT_TEST = 'ca-app-pub-3940256099942544/5224354917' // тестовый Google ID

export async function showRewardedAd() {
  if (PlatformService.isAndroid()) {
    await AdMob.prepareRewardVideoAd({
      adId: __DEV__ ? AD_UNIT_TEST : AD_UNIT_ID
    })
    const result = await AdMob.showRewardVideoAd()
    return result.value // количество наград
  } else {
    // VK Bridge (из TASK-007)
    return await vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'rewarded' })
  }
}
```

### 5. Подключить AdService во все 5 точек монетизации
- `HUD.js` — кнопка «+5 💎»
- `AutoMergeButton.js` — реклама при нехватке гемов
- `OfflineModal.js` — 2x оффлайн-доход
- `FillAllButton.js` — заполнить слоты за рекламу
- Бустер 2x дохода на 30 мин

---

## ✅ Критерии приёмки

- [ ] Тестовая реклама показывается на Android-устройстве
- [ ] После просмотра начисляется +5 💎
- [ ] В VK-сборке AdMob НЕ вызывается
- [ ] Graceful fallback при ошибке загрузки рекламы
