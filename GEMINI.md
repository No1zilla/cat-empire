# 🐱👑 Империя Котиков — Инструкции и Память Проекта

## Стиль UI (не ломать)

Очередь $10k (ларец, дюны, идол, указ) делается **в текущем хроме**, не новым скином.

- Поле 410×700, `TOKENS` (`#0D0A1C` / `#15102A` / `#FFD15C` / `#FF4757`), Fredoka
- Кнопки: `UIUtils.createButton` (тень + блик). Рубины: `createGemIcon` + `formatRubies`, никогда 💎
- Модалки как магазин: оверлей `#07040d`, карточка `#15102A`, золотой заголовок
- Реклама — `AdModal`. Покупки — `ShowOrderBox`, грант только после успеха
- Катить в `/dev/`, не в прод, пока не проверили в VK

Подробно: `PLAN.md` → «Стиль — закон».

---

## 🔑 Git & SSH Доступ
- **SSH Ключ для Git:** `~/.ssh/id_rsa_gith`
- **Команда деплоя/пуша в GitHub (Vercel):**
  ```bash
  GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_gith" git push origin main
  ```
- **Репозиторий:** `git@github.com:No1zilla/cat-empire.git` (ветка `main`)

---

## 🚀 Процесс деплоя фронтенда (VK Mini App)
1. Сборка для VK: `npm run build:vk`
2. Фиксация изменений: `git add . && git commit -m "..."`
3. Пуш в репозиторий: `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_gith" git push origin main`
4. **Vercel** автоматически подхватывает коммит из `main` и обновляет продакшн.

---

## 📲 VK Mini App Данные
- **APP_ID:** `54702054`
- **Ссылка в VK:** [vk.ru/app54702054](https://vk.ru/app54702054) (Рабочий инстанс)
- **Правило 2.3.8 (Синхронизация):** ВЫПОЛНЕНО И ВЕРИФИЦИРОВАНО. Трехсторонняя синхронизация (LocalStorage + VK Cloud Storage `VKWebAppStorageGet/Set` + PostgreSQL бэкенд на Railway) с прецедентом `totalMerges` > `totalCatsBought` > `coins`.
- **Правило 4.2.10 (Верстка & Кнопка Меню):** ВЫПОЛНЕНО. Единый контейнер 410px, Главное Меню, Окно Настроек, кавайная 3D розовая лапка `🐾` в HUD.

---

## 📱 Сборка Android APK
- **Синхронизация Capacitor:** `npx cap sync android`
- **Запуск Gradle сборки:**
  ```bash
  JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.12/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug
  ```
- **Готовый APK файл на Рабочем столе:** `/Users/ai/Desktop/CatEmpire.apk` (20.0 МБ)
- **Кастомная 3D Иконка:** 32-bit PNG 3D Kawaii Cat King в золотой короне на фиолетовом глянцевом стекле (`public/icon_512.png` + `mipmap-*`).

---

## 🧪 Автоматизированное тестирование (Test Suite)

В репозитории создана комплексная система авто-тестирования для предотвращения багов и регрессий:

1. **📸 Генерация золотых визуальных эталонов:**
   ```bash
   node tests/test_visual_snapshots.js
   ```
   *Захватывает 4 золотых PNG-снапшота компонентов при ширине 410px в `snapshots/`.*

2. **🔍 Попиксельный аудит визуальной регрессии (Visual Regression):**
   ```bash
   node tests/test_visual_regression.js
   ```
   *Выполняет RGBA-сравнение рендеринга Canvas 2D API с порогом допущения анти-алиасинга 3.5%.*

3. **🔄 E2E Тест кросс-платформенной синхронизации (Правило 2.3.8):**
   ```bash
   node tests/test_e2e_multi_device.js
   ```
   *Запускает 2 параллельных изолированных браузерных контекста (ПК и Смартфон) под одним VK ID.*

4. **📱 E2E Тест эмулятора Android (Pixel 5, Touch Events, Safe Area):**
   ```bash
   node tests/test_android_emulator.js
   ```
   *Проверяет нативный тач-спавн котиков, drag-and-drop мёрдж на сетке 5x5, тач-свайп Котопедии, живой туториал «🎓 Обучение», оверлей рекламы при 0 💎 и кнопку 🐾 в HUD.*
