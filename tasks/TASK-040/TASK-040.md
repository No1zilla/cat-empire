# 📌 TASK-040: Сборка APK/AAB — Подпись и финальная подготовка

> **Статус:** 🟡 В очереди
> **Приоритет:** Высокий (Фаза 4 — Android)
> **Зависимости:** TASK-035, TASK-036, TASK-037, TASK-038, TASK-039

---

## 🎯 Описание задачи

Собрать подписанный Android App Bundle (AAB) — финальный артефакт для загрузки в Google Play. APK нужен только для тестирования на устройствах.

---

## 🔑 Создание Keystore (один раз, хранить вечно!)

```bash
keytool -genkey -v \
  -keystore cat-empire-release.keystore \
  -alias cat-empire \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

> ⚠️ **КРИТИЧНО:** Сохранить `cat-empire-release.keystore` и пароли в надёжном месте.
> Без него нельзя обновлять приложение в Google Play.

---

## 🛠 Задачи

### 1. Настроить подпись в Android Studio
- Открыть `android/app/build.gradle`
- Добавить `signingConfigs`:
  ```gradle
  signingConfigs {
    release {
      storeFile file('../cat-empire-release.keystore')
      storePassword System.getenv("KEYSTORE_PASS")
      keyAlias "cat-empire"
      keyPassword System.getenv("KEY_PASS")
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
    }
  }
  ```

### 2. Настроить `build.gradle` (app уровень)
```gradle
android {
  defaultConfig {
    applicationId "ru.catempire.game"
    minSdkVersion 21        // Android 5.0+ (97% устройств)
    targetSdkVersion 34
    versionCode 1
    versionName "1.0.0"
  }
}

dependencies {
  implementation 'com.google.android.gms:play-services-ads:23.0.0'
  implementation 'com.android.billingclient:billing:7.0.0'
}
```

### 3. Иконки приложения
Сгенерировать из иконки 512×512 (уже есть, TASK-014):
```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png     (48×48)
├── mipmap-hdpi/ic_launcher.png     (72×72)
├── mipmap-xhdpi/ic_launcher.png    (96×96)
├── mipmap-xxhdpi/ic_launcher.png   (144×144)
└── mipmap-xxxhdpi/ic_launcher.png  (192×192)
```
Инструмент: [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)

### 4. Сборка AAB
В Android Studio: **Build → Generate Signed Bundle/APK → Android App Bundle → Release**

Или через командную строку:
```bash
cd android && ./gradlew bundleRelease
# Результат: android/app/build/outputs/bundle/release/app-release.aab
```

### 5. Тестирование на реальном устройстве (APK)
```bash
cd android && ./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

---

## 📦 Что должно быть готово перед сборкой

- [ ] `google-services.json` добавлен (TASK-039)
- [ ] AdMob App ID прописан в `AndroidManifest.xml` (TASK-037)
- [ ] IAP продукты созданы в Google Play Console (TASK-038)
- [ ] Иконки всех размеров готовы
- [ ] Keystore создан и сохранён

---

## ✅ Критерии приёмки

- [ ] `./gradlew bundleRelease` завершается без ошибок
- [ ] AAB файл создан и подписан
- [ ] Игра запускается на реальном Android устройстве (не только эмулятор)
- [ ] Реклама показывается (тестовая)
- [ ] Покупки проходят (тестовый режим)
