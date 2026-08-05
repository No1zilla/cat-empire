# 📌 TASK-036: ENV-профиль — VK vs Android (Platform Switch)

> **Статус:** 🟡 В очереди
> **Приоритет:** Высокий (Фаза 4 — Android)
> **Зависимости:** TASK-035

---

## 🎯 Описание задачи

Создать систему переключения платформ через переменные окружения, чтобы **одна кодовая база** работала и как VK Mini App, и как Android APK. Никакого дублирования логики.

---

## 🏗 Архитектура

```
src/
└── services/
    └── PlatformService.js   ← новый файл, центральный роутер платформ
```

Запуск для VK:
```bash
npm run build           # PLATFORM=vk (по умолчанию)
```

Запуск для Android:
```bash
PLATFORM=android npm run build
```

---

## 🛠 Задачи

1. В `vite.config.js` добавить:
   ```js
   define: {
     __PLATFORM__: JSON.stringify(process.env.PLATFORM || 'vk')
   }
   ```

2. Создать `src/services/PlatformService.js`:
   ```js
   export const isVK = () => __PLATFORM__ === 'vk'
   export const isAndroid = () => __PLATFORM__ === 'android'
   ```

3. В `package.json` добавить скрипты:
   ```json
   "build:vk": "PLATFORM=vk vite build",
   "build:android": "PLATFORM=android vite build && npx cap copy android"
   ```

4. Заменить все прямые обращения к `vkBridge` на вызовы через `PlatformService`

5. Заглушка VK Bridge для Android (mock без ошибок в консоли):
   ```js
   // src/vk/VKBridge.js — уже есть mock-логика, расширить под Android
   ```

---

## ✅ Критерии приёмки

- [ ] `npm run build:vk` собирает VK-версию без ошибок
- [ ] `npm run build:android` собирает Android-версию без ошибок
- [ ] В Android-сборке нет вызовов VK Bridge в консоли
- [ ] `__PLATFORM__` корректно определяется в рантайме
