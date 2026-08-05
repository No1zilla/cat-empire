# 📌 TASK-048: Релизная цифровое подпись APK/AAB и устранение предупреждения «Установка из неизвестного источника»

> **Статус:** 🟡 В очереди
> **Приоритет:** Высокий (Релизный плагин безопасности Android & RuStore / Google Play)
> **Зависимости:** TASK-035 (Capacitor Android)

---

## 🎯 Проблема

При вызове стандартной отладочной сборки (`assembleDebug` / `debug.keystore`) операционная система Android помечает APK при ручной установке как **«Установка из неизвестного источника / Опасное приложение»**.

### Корневая причина:
- `debug.keystore` имеет стандартные публичные пароли (`android`/`android`) и валиден всего 30 дней.
- Android OS и сервис **Google Play Protect** / **RuStore Verification** считают такие ключи ненадёжными и предупреждают пользователя о риске безопасности.

---

## 🛠 Пошаговый план решения

### 1. Генерация уникального официального Release Keystore (`release.keystore`)
Сгенерировать безопасный RSA-4096 / ECC ключик разработчика с валидностью 10 000 дней:
```bash
keytool -genkey -v -keystore android/app/cat-empire-release.jks \
  -alias catempire -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Cat Empire Developer, OU=Gaming, O=Cat Empire Studio, L=Moscow, C=RU"
```

### 2. Настройка `signingConfigs` в `android/app/build.gradle`
Добавить конфигурацию подписи в Gradle:
```groovy
android {
    signingConfigs {
        release {
            storeFile file('cat-empire-release.jks')
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "catempire2026pass"
            keyAlias "catempire"
            keyPassword System.getenv("KEY_PASSWORD") ?: "catempire2026pass"
            v1SigningEnabled true
            v2SigningEnabled true
            v3SigningEnabled true
            v4SigningEnabled true
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Верификация через `apksigner`
Проверить схемы подписи (V1/V2/V3/V4):
```bash
apksigner verify --verbose /Users/ai/Desktop/CatEmpire.apk
```

### 4. Подача в RuStore / Google Play Console
При публикации в магазине приложений сертификат верифицируется модерацией, после чего скачивание из магазина происходит **без единого предупреждения** безопасности.

---

## ✅ Критерии приёмки

- [ ] Создан и сохранён в надёжном месте файл `cat-empire-release.jks`
- [ ] В `build.gradle` добавлена конфигурация `signingConfigs.release`
- [ ] Команда `./gradlew assembleRelease` генерирует оптимизированный релизный APK/AAB
- [ ] `apksigner` подтверждает валидность схем подписи V1/V2/V3/V4
- [ ] Сборка готова для безнаказанной заливки в RuStore и Google Play Console
