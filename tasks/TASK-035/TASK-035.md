# 📌 TASK-035: Capacitor.js — Упаковка веб-приложения в Android

> **Статус:** 🟡 В очереди
> **Приоритет:** Высокий (Фаза 4 — Android)
> **Зависимости:** Стабильный релиз VK Mini App (Фаза 1)

---

## 🎯 Описание задачи

Интегрировать [Capacitor.js](https://capacitorjs.com/) в проект, чтобы упаковать существующее Vite + PixiJS веб-приложение в нативный Android APK **без переписывания игровой логики**.

Capacitor оборачивает `dist/` папку в Android WebView с доступом к нативным API (камера, вибрация, хранилище, уведомления).

---

## 🛠 Задачи

1. Установить зависимости:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Инициализировать Capacitor:
   ```bash
   npx cap init "Империя Котиков" "ru.catempire.game" --web-dir dist
   ```
3. Добавить Android платформу:
   ```bash
   npx cap add android
   ```
4. Настроить `capacitor.config.json`:
   - `appId: "ru.catempire.game"`
   - `appName: "Империя Котиков"`
   - `webDir: "dist"`
   - `bundledWebRuntime: false`
5. Проверить сборку: `npm run build && npx cap copy android`
6. Открыть в Android Studio: `npx cap open android`
7. Запустить на эмуляторе или реальном устройстве

---

## ✅ Критерии приёмки

- [ ] `npx cap init` выполняется без ошибок
- [ ] `npx cap add android` создаёт папку `android/`
- [ ] `npx cap copy android` копирует `dist/` в Android проект
- [ ] Игра запускается в Android Emulator (API 21+)
- [ ] Canvas PixiJS рендерится корректно в WebView
